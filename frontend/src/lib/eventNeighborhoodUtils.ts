import { useMemo } from 'react'
import type { EventNotification } from '../stores/simulationStore'

export function getEventsByNeighborhoodId(
  events: EventNotification[],
  neighborhoodId: string
): EventNotification[] {
  return events.filter((event) => event.zoneId === neighborhoodId)
}

export function getNeighborhoodIdsWithEvents(
  events: EventNotification[]
): Set<string> {
  return new Set(events.map((event) => event.zoneId))
}

export function getEventCountByNeighborhood(
  events: EventNotification[]
): Record<string, number> {
  return events.reduce((acc, event) => {
    acc[event.zoneId] = (acc[event.zoneId] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

export function hasEventsInNeighborhood(
  events: EventNotification[],
  neighborhoodId: string
): boolean {
  return events.some((event) => event.zoneId === neighborhoodId)
}

export function useEventsByNeighborhood(
  events: EventNotification[],
  neighborhoodId: string | null
) {
  return useMemo(() => {
    if (!neighborhoodId) return []
    return getEventsByNeighborhoodId(events, neighborhoodId)
  }, [events, neighborhoodId])
}

export function useNeighborhoodsWithEvents(events: EventNotification[]) {
  return useMemo(() => getNeighborhoodIdsWithEvents(events), [events])
}

