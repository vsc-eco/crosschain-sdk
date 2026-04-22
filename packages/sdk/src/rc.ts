import type { MagiConfig } from '@vsc.eco/crosschain-core';

export interface AccountRc {
	account: string;
	amount: bigint;
	maxRcs: bigint;
	blockHeight: bigint;
}

export interface SimulateResult {
	success: boolean;
	rcUsed: bigint;
	err?: string;
	errMsg?: string;
}

export interface RcCheckResult {
	simOk: boolean;
	rcUsed: bigint;
	rcAvailable: bigint;
	sufficient: boolean;
	/** `max(0, rcUsed - rcAvailable)`. RC units are 1 HBD = 1000 RC,
	 *  so divide by 1000 for user-facing HBD display. */
	rcShortfall: bigint;
	err?: string;
	errMsg?: string;
}

/** Sim-ready contract call — shape mirrors `SimulateContractCallInput`. */
export interface SwapCallSpec {
	contract_id: string;
	action: string;
	payload: string;
	rc_limit: number;
	intents: Array<{ type: string; args: Record<string, string> }>;
}

function gqlEndpoints(config: MagiConfig): string[] {
	const bases =
		config.gqlUrls && config.gqlUrls.length > 0
			? config.gqlUrls
			: config.gqlUrl
				? [config.gqlUrl]
				: ['https://api.vsc.eco'];
	return bases.map((base) => `${base.replace(/\/+$/, '')}/api/v1/graphql`);
}

async function gqlPostOnce<T>(
	url: string,
	body: { query: string; variables?: Record<string, unknown> }
): Promise<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
	const parsed = (await res.json()) as {
		data?: T;
		errors?: Array<{ message: string }>;
	};
	if (parsed.errors?.length) {
		throw new Error(parsed.errors.map((e) => e.message).join('; '));
	}
	if (!parsed.data) throw new Error(`${url} → no data in response`);
	return parsed.data;
}

/** Try each endpoint in order; return the first successful result. The
 *  function surfaces the last error only if every node fails — any single
 *  failure (HTTP, transport, GraphQL error, missing data) is enough to
 *  trigger the next fallback. */
async function gqlPost<T>(
	config: MagiConfig,
	body: { query: string; variables?: Record<string, unknown> }
): Promise<T> {
	const urls = gqlEndpoints(config);
	const errors: string[] = [];
	for (const url of urls) {
		try {
			return await gqlPostOnce<T>(url, body);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`${url}: ${msg}`);
		}
	}
	throw new Error(`All GraphQL endpoints failed — ${errors.join(' | ')}`);
}

export async function getAccountRc(
	config: MagiConfig,
	account: string
): Promise<AccountRc> {
	const data = await gqlPost<{
		getAccountRC: {
			account: string;
			amount: string | number;
			max_rcs: string | number;
			block_height: string | number;
		} | null;
	}>(config, {
		query:
			'query($account: String!) { getAccountRC(account: $account) { account amount max_rcs block_height } }',
		variables: { account }
	});
	const rec = data.getAccountRC;
	if (!rec) throw new Error(`No RC record for ${account}`);
	return {
		account: rec.account,
		amount: BigInt(rec.amount),
		maxRcs: BigInt(rec.max_rcs),
		blockHeight: BigInt(rec.block_height)
	};
}

/**
 * Run `simulateContractCalls` for a single contract call. The VSC node
 * executes the call in a read-only sandbox and returns `rc_used` regardless
 * of whether the call would have succeeded, so callers should inspect both
 * `success` and `rcUsed` — a failed sim still tells you how much RC the
 * node burned getting to the failure.
 */
export async function simulateSwapCall(
	config: MagiConfig,
	params: { username: string; call: SwapCallSpec; txId?: string }
): Promise<SimulateResult> {
	const txId =
		params.txId ?? `sim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
	const data = await gqlPost<{
		simulateContractCalls: Array<{
			success: boolean;
			err: string | null;
			err_msg: string | null;
			rc_used: string | number;
		}>;
	}>(config, {
		query:
			'query($input: SimulateContractCallsInput!) { simulateContractCalls(input: $input) { success err err_msg rc_used } }',
		variables: {
			input: {
				tx_id: txId,
				required_auths: [`hive:${params.username}`],
				required_posting_auths: [],
				calls: [params.call]
			}
		}
	});
	const first = data.simulateContractCalls[0];
	if (!first) throw new Error('simulateContractCalls returned no results');
	return {
		success: first.success,
		rcUsed: BigInt(first.rc_used),
		err: first.err ?? undefined,
		errMsg: first.err_msg ?? undefined
	};
}

/** Unwrap the sim-ready call spec from a `custom_json` swap op. */
export function simCallFromSwapOp(op: unknown): SwapCallSpec {
	if (!Array.isArray(op) || op[0] !== 'custom_json') {
		throw new Error('Expected a custom_json op');
	}
	const body = op[1] as { json?: string };
	if (typeof body?.json !== 'string') {
		throw new Error('custom_json op missing `json` field');
	}
	const inner = JSON.parse(body.json) as {
		contract_id: string;
		action: string;
		payload: string;
		rc_limit: number;
		intents?: SwapCallSpec['intents'];
	};
	return {
		contract_id: inner.contract_id,
		action: inner.action,
		payload: inner.payload,
		rc_limit: inner.rc_limit,
		intents: inner.intents ?? []
	};
}

/**
 * Simulate the swap + read the user's current RC + report whether the
 * sim's cost is covered. Both calls run in parallel against the same node.
 */
export async function checkSwapRc(
	config: MagiConfig,
	params: { username: string; call: SwapCallSpec; txId?: string }
): Promise<RcCheckResult> {
	const [sim, rc] = await Promise.all([
		simulateSwapCall(config, params),
		getAccountRc(config, `hive:${params.username}`)
	]);
	const shortfall = sim.rcUsed > rc.amount ? sim.rcUsed - rc.amount : 0n;
	return {
		simOk: sim.success,
		rcUsed: sim.rcUsed,
		rcAvailable: rc.amount,
		sufficient: sim.success && shortfall === 0n,
		rcShortfall: shortfall,
		err: sim.err,
		errMsg: sim.errMsg
	};
}
