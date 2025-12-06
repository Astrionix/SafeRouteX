import { query } from '../config/database.js';
import * as turf from '@turf/turf';

// Safety score weights
const WEIGHTS = {
    cctv: 0.3,
    streetlight: 0.3,
    crime: 0.4,
    timeModifier: 0.1
};

// =====================================
// SAFEST ROUTE CALCULATION
// Uses modified Dijkstra with safety scores
// =====================================
export async function calculateSafestRoute(origin, destination, time = new Date()) {
    try {
        // Get road network graph from database
        const roads = await getRoadNetwork(origin, destination);

        if (roads.length === 0) {
            // Fallback to direct line if no roads found
            return createDirectRoute(origin, destination, 'safest');
        }

        // Build graph from roads
        const graph = buildGraph(roads);

        // Find start and end nodes
        const startNode = await findNearestNode(origin.lat, origin.lon, roads);
        const endNode = await findNearestNode(destination.lat, destination.lon, roads);

        if (!startNode || !endNode) {
            return createDirectRoute(origin, destination, 'safest');
        }

        // Apply time-based modifier to safety scores
        const timeModifier = getTimeModifier(time);

        // Run modified Dijkstra with safety-weighted edges
        const path = dijkstraSafest(graph, startNode, endNode, timeModifier);

        if (!path || path.length === 0) {
            return createDirectRoute(origin, destination, 'safest');
        }

        // Build route geometry from path
        const routeGeometry = buildRouteGeometry(path, roads, origin, destination);

        // Calculate total distance and safety score
        const totalDistance = turf.length(turf.lineString(routeGeometry.coordinates), { units: 'kilometers' });
        const avgSafetyScore = calculatePathSafetyScore(path, roads);

        return {
            geometry: routeGeometry,
            distance: totalDistance,
            distanceText: `${totalDistance.toFixed(2)} km`,
            duration: estimateDuration(totalDistance, 'walk'),
            safetyScore: avgSafetyScore,
            segments: path.map(nodeId => ({
                nodeId,
                safetyScore: graph.nodes[nodeId]?.safetyScore || 0.5
            }))
        };
    } catch (error) {
        console.error('Error calculating safest route:', error);
        return createDirectRoute(origin, destination, 'safest');
    }
}

// =====================================
// FASTEST ROUTE CALCULATION
// Uses standard Dijkstra with distance weights
// =====================================
export async function calculateFastestRoute(origin, destination) {
    try {
        // Get road network graph from database
        const roads = await getRoadNetwork(origin, destination);

        if (roads.length === 0) {
            return createDirectRoute(origin, destination, 'fastest');
        }

        // Build graph from roads
        const graph = buildGraph(roads);

        // Find start and end nodes
        const startNode = await findNearestNode(origin.lat, origin.lon, roads);
        const endNode = await findNearestNode(destination.lat, destination.lon, roads);

        if (!startNode || !endNode) {
            return createDirectRoute(origin, destination, 'fastest');
        }

        // Run standard Dijkstra with distance weights
        const path = dijkstraFastest(graph, startNode, endNode);

        if (!path || path.length === 0) {
            return createDirectRoute(origin, destination, 'fastest');
        }

        // Build route geometry from path
        const routeGeometry = buildRouteGeometry(path, roads, origin, destination);

        // Calculate total distance
        const totalDistance = turf.length(turf.lineString(routeGeometry.coordinates), { units: 'kilometers' });

        return {
            geometry: routeGeometry,
            distance: totalDistance,
            distanceText: `${totalDistance.toFixed(2)} km`,
            duration: estimateDuration(totalDistance, 'walk'),
            safetyScore: calculatePathSafetyScore(path, roads),
            segments: path.map(nodeId => ({
                nodeId
            }))
        };
    } catch (error) {
        console.error('Error calculating fastest route:', error);
        return createDirectRoute(origin, destination, 'fastest');
    }
}

// =====================================
// HELPER FUNCTIONS
// =====================================

async function getRoadNetwork(origin, destination) {
    // Create bounding box with buffer
    const bbox = {
        minLat: Math.min(origin.lat, destination.lat) - 0.01,
        maxLat: Math.max(origin.lat, destination.lat) + 0.01,
        minLon: Math.min(origin.lon, destination.lon) - 0.01,
        maxLon: Math.max(origin.lon, destination.lon) + 0.01
    };

    const result = await query(`
    SELECT 
      id, osm_id, name, road_type, 
      ST_AsGeoJSON(geometry)::json as geometry,
      length_meters, safety_score, cctv_density, light_density, crime_density,
      start_node, end_node
    FROM roads
    WHERE geometry && ST_MakeEnvelope($1, $2, $3, $4, 4326)
    ORDER BY safety_score DESC
    LIMIT 1000
  `, [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat]);

    return result.rows;
}

async function findNearestNode(lat, lon, roads) {
    if (roads.length === 0) return null;

    const point = turf.point([lon, lat]);
    let nearestNode = null;
    let minDistance = Infinity;

    for (const road of roads) {
        if (road.start_node) {
            const startPoint = getNodeCoordinates(road.start_node, roads);
            if (startPoint) {
                const dist = turf.distance(point, startPoint, { units: 'meters' });
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestNode = road.start_node;
                }
            }
        }
        if (road.end_node) {
            const endPoint = getNodeCoordinates(road.end_node, roads);
            if (endPoint) {
                const dist = turf.distance(point, endPoint, { units: 'meters' });
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestNode = road.end_node;
                }
            }
        }
    }

    // If no nodes found, use first road's start node
    if (!nearestNode && roads.length > 0) {
        nearestNode = roads[0].start_node || 1;
    }

    return nearestNode;
}

function getNodeCoordinates(nodeId, roads) {
    for (const road of roads) {
        if (road.geometry && road.geometry.coordinates) {
            if (road.start_node === nodeId) {
                return turf.point(road.geometry.coordinates[0]);
            }
            if (road.end_node === nodeId) {
                return turf.point(road.geometry.coordinates[road.geometry.coordinates.length - 1]);
            }
        }
    }
    return null;
}

function buildGraph(roads) {
    const nodes = {};
    const edges = {};

    for (const road of roads) {
        const startNode = road.start_node || road.id;
        const endNode = road.end_node || road.id + '_end';

        // Add nodes
        if (!nodes[startNode]) {
            nodes[startNode] = {
                id: startNode,
                safetyScore: road.safety_score || 0.5,
                coordinates: road.geometry?.coordinates?.[0]
            };
        }
        if (!nodes[endNode]) {
            nodes[endNode] = {
                id: endNode,
                safetyScore: road.safety_score || 0.5,
                coordinates: road.geometry?.coordinates?.[road.geometry.coordinates.length - 1]
            };
        }

        // Add edge (bidirectional by default)
        const edgeId = `${startNode}-${endNode}`;
        edges[edgeId] = {
            from: startNode,
            to: endNode,
            roadId: road.id,
            distance: road.length_meters || 100,
            safetyScore: road.safety_score || 0.5,
            // For safest route: lower weight = better (safer)
            safetyWeight: 1 / Math.max(road.safety_score || 0.5, 0.1),
            // For fastest route: lower weight = better (shorter)
            distanceWeight: road.length_meters || 100
        };

        // Reverse edge if not oneway
        const reverseEdgeId = `${endNode}-${startNode}`;
        edges[reverseEdgeId] = { ...edges[edgeId], from: endNode, to: startNode };
    }

    return { nodes, edges };
}

function dijkstraSafest(graph, start, end, timeModifier = 1) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();

    // Initialize
    for (const nodeId in graph.nodes) {
        distances[nodeId] = Infinity;
        unvisited.add(nodeId);
    }
    distances[start] = 0;

    while (unvisited.size > 0) {
        // Find node with minimum distance
        let current = null;
        let minDist = Infinity;
        for (const nodeId of unvisited) {
            if (distances[nodeId] < minDist) {
                minDist = distances[nodeId];
                current = nodeId;
            }
        }

        if (current === null || current === end) break;
        unvisited.delete(current);

        // Update neighbors
        for (const edgeId in graph.edges) {
            const edge = graph.edges[edgeId];
            if (edge.from === current && unvisited.has(edge.to)) {
                // Apply time modifier to safety weight
                const weight = edge.safetyWeight * timeModifier;
                const alt = distances[current] + weight;
                if (alt < distances[edge.to]) {
                    distances[edge.to] = alt;
                    previous[edge.to] = current;
                }
            }
        }
    }

    // Reconstruct path
    const path = [];
    let current = end;
    while (current) {
        path.unshift(current);
        current = previous[current];
    }

    return path[0] === start ? path : [];
}

function dijkstraFastest(graph, start, end) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();

    // Initialize
    for (const nodeId in graph.nodes) {
        distances[nodeId] = Infinity;
        unvisited.add(nodeId);
    }
    distances[start] = 0;

    while (unvisited.size > 0) {
        // Find node with minimum distance
        let current = null;
        let minDist = Infinity;
        for (const nodeId of unvisited) {
            if (distances[nodeId] < minDist) {
                minDist = distances[nodeId];
                current = nodeId;
            }
        }

        if (current === null || current === end) break;
        unvisited.delete(current);

        // Update neighbors
        for (const edgeId in graph.edges) {
            const edge = graph.edges[edgeId];
            if (edge.from === current && unvisited.has(edge.to)) {
                const alt = distances[current] + edge.distanceWeight;
                if (alt < distances[edge.to]) {
                    distances[edge.to] = alt;
                    previous[edge.to] = current;
                }
            }
        }
    }

    // Reconstruct path
    const path = [];
    let current = end;
    while (current) {
        path.unshift(current);
        current = previous[current];
    }

    return path[0] === start ? path : [];
}

function buildRouteGeometry(path, roads, origin, destination) {
    const coordinates = [[origin.lon, origin.lat]];

    // Add intermediate points from path
    for (let i = 0; i < path.length - 1; i++) {
        const fromNode = path[i];
        const toNode = path[i + 1];

        // Find road connecting these nodes
        const road = roads.find(r =>
            (r.start_node === fromNode && r.end_node === toNode) ||
            (r.start_node === toNode && r.end_node === fromNode)
        );

        if (road && road.geometry && road.geometry.coordinates) {
            const roadCoords = road.geometry.coordinates;
            // Add road coordinates (might need to reverse)
            if (road.start_node === fromNode) {
                coordinates.push(...roadCoords);
            } else {
                coordinates.push(...roadCoords.slice().reverse());
            }
        }
    }

    coordinates.push([destination.lon, destination.lat]);

    return {
        type: 'LineString',
        coordinates
    };
}

function calculatePathSafetyScore(path, roads) {
    if (path.length === 0) return 0.5;

    let totalScore = 0;
    let count = 0;

    for (const road of roads) {
        if (path.includes(road.start_node) || path.includes(road.end_node)) {
            totalScore += road.safety_score || 0.5;
            count++;
        }
    }

    return count > 0 ? totalScore / count : 0.5;
}

function getTimeModifier(time) {
    const hour = time.getHours();

    // Night hours (10 PM - 6 AM) have higher risk
    if (hour >= 22 || hour < 6) {
        return 1.5; // Increase weight of unsafe roads
    }
    // Early morning/evening (6-8 AM, 6-10 PM)
    if (hour < 8 || hour >= 18) {
        return 1.2;
    }
    // Daytime is safest
    return 1.0;
}

function estimateDuration(distanceKm, mode = 'walk') {
    const speeds = {
        walk: 5, // 5 km/h walking
        bike: 15,
        car: 30
    };

    const speed = speeds[mode] || speeds.walk;
    const hours = distanceKm / speed;
    const minutes = Math.round(hours * 60);

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
}

function createDirectRoute(origin, destination, type) {
    const coordinates = [
        [origin.lon, origin.lat],
        [destination.lon, destination.lat]
    ];

    const distance = turf.distance(
        turf.point([origin.lon, origin.lat]),
        turf.point([destination.lon, destination.lat]),
        { units: 'kilometers' }
    );

    return {
        geometry: {
            type: 'LineString',
            coordinates
        },
        distance,
        distanceText: `${distance.toFixed(2)} km`,
        duration: estimateDuration(distance, 'walk'),
        safetyScore: 0.5,
        segments: [],
        isDirectLine: true,
        message: 'No road network found, showing direct line'
    };
}
