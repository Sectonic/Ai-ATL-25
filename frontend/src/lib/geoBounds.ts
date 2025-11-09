type Coordinate = [number, number]

export function isPointInPolygon(point: Coordinate, polygon: Coordinate[][]): boolean {
  const [lat, lng] = point
  const rings = polygon

  for (const ring of rings) {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [lngI, latI] = ring[i]
      const [lngJ, latJ] = ring[j]

      const intersect = ((latI > lat) !== (latJ > lat)) &&
        (lng < (lngJ - lngI) * (lat - latI) / (latJ - latI) + lngI)

      if (intersect) inside = !inside
    }

    if (inside) return true
  }

  return false
}

function distanceToSegment(point: Coordinate, start: Coordinate, end: Coordinate): { distance: number, closest: Coordinate } {
  const [lat, lng] = point
  const [startLng, startLat] = start
  const [endLng, endLat] = end

  const dx = endLng - startLng
  const dy = endLat - startLat

  if (dx === 0 && dy === 0) {
    const dist = Math.sqrt((lng - startLng) ** 2 + (lat - startLat) ** 2)
    return { distance: dist, closest: [startLat, startLng] }
  }

  const t = Math.max(0, Math.min(1, ((lng - startLng) * dx + (lat - startLat) * dy) / (dx * dx + dy * dy)))

  const closestLng = startLng + t * dx
  const closestLat = startLat + t * dy

  const dist = Math.sqrt((lng - closestLng) ** 2 + (lat - closestLat) ** 2)

  return { distance: dist, closest: [closestLat, closestLng] }
}

export function findNearestPointOnPolygon(point: Coordinate, polygon: Coordinate[][]): Coordinate {
  let minDistance = Infinity
  let nearestPoint: Coordinate = point

  for (const ring of polygon) {
    for (let i = 0; i < ring.length - 1; i++) {
      const start = ring[i]
      const end = ring[i + 1]

      const { distance, closest } = distanceToSegment(point, start, end)

      if (distance < minDistance) {
        minDistance = distance
        nearestPoint = closest
      }
    }
  }

  return nearestPoint
}

export function adjustCoordinatesToBounds(
  coordinates: Coordinate,
  zoneName: string,
  neighborhoodsData: GeoJSON.FeatureCollection
): Coordinate {
  const feature = neighborhoodsData.features.find(
    (f) => f.properties?.name === zoneName
  )

  if (!feature) {
    return coordinates
  }

  let polygons: Coordinate[][][]

  if (feature.geometry.type === 'Polygon') {
    polygons = [feature.geometry.coordinates as Coordinate[][]]
  } else if (feature.geometry.type === 'MultiPolygon') {
    polygons = feature.geometry.coordinates as Coordinate[][][]
  } else {
    return coordinates
  }

  for (const polygon of polygons) {
    if (isPointInPolygon(coordinates, polygon)) {
      return coordinates
    }
  }

  let nearestEdge: Coordinate = coordinates
  let minDistance = Infinity

  for (const polygon of polygons) {
    const edge = findNearestPointOnPolygon(coordinates, polygon)
    const [lat, lng] = coordinates
    const [edgeLat, edgeLng] = edge
    const dist = Math.sqrt((edgeLat - lat) ** 2 + (edgeLng - lng) ** 2)

    if (dist < minDistance) {
      minDistance = dist
      nearestEdge = edge
    }
  }

  const [lat, lng] = coordinates
  const [edgeLat, edgeLng] = nearestEdge

  const deltaLat = edgeLat - lat
  const deltaLng = edgeLng - lng

  const distance = Math.sqrt(deltaLat ** 2 + deltaLng ** 2)

  if (distance === 0) {
    return coordinates
  }

  const pushInDistance = 0.0005
  const adjustedLat = edgeLat + (deltaLat / distance) * pushInDistance
  const adjustedLng = edgeLng + (deltaLng / distance) * pushInDistance

  return [adjustedLat, adjustedLng]
}
