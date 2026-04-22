import yaml from 'js-yaml';

interface SimplifiedNextLink {
	to: string;
	pipe?: Record<string, string>;
	flow?: 'default' | 'if' | 'forEach';
	gate?: string;
	condition?: boolean | string | number;
}

interface SimplifiedWorkflowNode {
	id: string;
	app: {appId: string; version: string};
	action: string;
	inputs?: Record<string, string>;
	outputs?: Record<string, string>;
	next?: SimplifiedNextLink[];
}

interface SimplifiedWorkflowDAG {
	name: string;
	version: string;
	description?: string;
	entry: string;
	exit?: string;
	nodes: SimplifiedWorkflowNode[];
	env?: Record<string, string>;
}

function typeToHint(t: any): string {
	if (Array.isArray(t)) {
		return typeToHint(t[0]) + '[]';
	}
	return typeof t === 'string' ? t : 'string';
}

export function workflowContentToYaml(
	workflow: {name: string; version: string; description?: string; content: any},
): string {
	const content = workflow.content;
	const nodes: any[] = content?.nodes ?? [];
	const edges: any[] = content?.edges ?? [];
	const requiredEnvs: any[] = content?.requiredEnvs ?? [];

	// Find entry and exit nodes
	let entry = '';
	let exit = '';
	for (const node of nodes) {
		if (node?.data?.isDefaultEntry) entry = node.id;
		if (node?.data?.isDefaultExit) exit = node.id;
	}

	// Build edge map: source → list of edges
	const edgesBySource = new Map<string, any[]>();
	for (const edge of edges) {
		const list = edgesBySource.get(edge.source) ?? [];
		list.push(edge);
		edgesBySource.set(edge.source, list);
	}

	// Group edges by source+target to reconstruct pipe maps
	function buildNextLinks(nodeId: string): SimplifiedNextLink[] | undefined {
		const nodeEdges = edgesBySource.get(nodeId);
		if (!nodeEdges || nodeEdges.length === 0) return undefined;

		// Group by target
		const byTarget = new Map<string, any[]>();
		for (const edge of nodeEdges) {
			const list = byTarget.get(edge.target) ?? [];
			list.push(edge);
			byTarget.set(edge.target, list);
		}

		const links: SimplifiedNextLink[] = [];
		for (const [target, targetEdges] of byTarget) {
			const link: SimplifiedNextLink = {to: target};

			// Reconstruct pipe from sourceHandle→targetHandle pairs
			const pipe: Record<string, string> = {};
			let hasPipe = false;
			for (const edge of targetEdges) {
				if (edge.sourceHandle && edge.targetHandle) {
					pipe[edge.targetHandle] = edge.sourceHandle;
					hasPipe = true;
				}
			}
			if (hasPipe) link.pipe = pipe;

			// Flow type from edge data
			const edgeData = targetEdges[0]?.data;
			if (edgeData?.flowType === 'if') {
				link.flow = 'if';
				if (edgeData.condition !== undefined && edgeData.condition !== true) {
					link.condition = edgeData.condition;
				}
			} else if (edgeData?.flowType === 'forEach') {
				link.flow = 'forEach';
			}

			// Gate from sourceHandle (only if no pipe)
			if (!hasPipe && targetEdges[0]?.sourceHandle) {
				link.gate = targetEdges[0].sourceHandle;
			}

			links.push(link);
		}

		return links;
	}

	// Convert nodes
	const simplifiedNodes: SimplifiedWorkflowNode[] = nodes.map((node: any) => {
		const data = node.data ?? {};
		const config = data.config ?? {};
		const action = data.selectedAction;

		const simplified: SimplifiedWorkflowNode = {
			id: node.id,
			app: {
				appId: config.app ?? '',
				version: config.requiredVersion ?? '',
			},
			action: action?.name ?? '',
		};

		// Convert parameters back to inputs (type hints)
		if (action?.parameters && Object.keys(action.parameters).length > 0) {
			const inputs: Record<string, string> = {};
			for (const [key, val] of Object.entries(action.parameters as Record<string, any>)) {
				inputs[key] = typeToHint(val?.type);
			}
			simplified.inputs = inputs;
		}

		// Convert returns back to outputs
		if (action?.returns && Object.keys(action.returns).length > 0) {
			const outputs: Record<string, string> = {};
			for (const [key, val] of Object.entries(action.returns as Record<string, any>)) {
				outputs[key] = typeToHint(val?.type);
			}
			simplified.outputs = outputs;
		}

		const next = buildNextLinks(node.id);
		if (next) simplified.next = next;

		return simplified;
	});

	const dag: SimplifiedWorkflowDAG = {
		name: workflow.name,
		version: workflow.version,
		entry,
		nodes: simplifiedNodes,
	};

	if (workflow.description) dag.description = workflow.description;
	if (exit) dag.exit = exit;

	if (requiredEnvs.length > 0) {
		dag.env = {};
		for (const env of requiredEnvs) {
			dag.env[env.key] = env.description ?? '';
		}
	}

	return yaml.dump(dag, {lineWidth: 120, noRefs: true, quotingType: '"'});
}
