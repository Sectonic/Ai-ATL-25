import { useQuery } from '@tanstack/react-query'

export interface AgentData {
  agent_id: string
  description: string
}

export type AgentsMapping = Record<string, AgentData>

const fetchAgentsMapping = async (): Promise<AgentsMapping> => {
  const response = await fetch('/agents-mapping.json')

  if (!response.ok) {
    throw new Error('Failed to fetch agents mapping')
  }

  return response.json()
}

/**
 * Hook to fetch the agents mapping data using React Query
 * @returns Query result with agents mapping data
 */
export function useAgentsMapping() {
  return useQuery<AgentsMapping>({
    queryKey: ['agentsMapping'],
    queryFn: fetchAgentsMapping,
    staleTime: Infinity, // Data doesn't change, cache forever
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch a specific agent's data by name
 * @param constituentName - The name of the constituent
 * @returns Query result with specific agent data
 */
export function useAgentData(constituentName: string | null) {
  const { data: agentsMapping, ...queryState } = useAgentsMapping()

  return {
    ...queryState,
    data: constituentName && agentsMapping ? agentsMapping[constituentName] : null,
  }
}
