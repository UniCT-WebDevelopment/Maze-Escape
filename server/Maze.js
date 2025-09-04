import { Vector2, Vector3 } from 'three';
import Graph from './Graph.js';
import Node from './GraphNode.js';

export default class Maze extends Graph {
	constructor({ resolution = new Vector2(20, 20), cellSize = 1 } = {}) {
		super();

		this.resolution = resolution;
		const { x, y } = resolution;
		this.cellSize = cellSize;

		for (let i = 0; i < x * y; i++) {
			const cell = this.addNode(new Cell({ maze: this }));
		}

		this.generate();
	}

	generate() {
		const stack = []
		let currentNode = this.nodes[26]
		currentNode.visited = true

		do {
			const neighborsIndex = currentNode.getNeighbors()
			const unvisitedNeighbors = this.nodes.filter((node, i) => {
				return !node.visited && neighborsIndex.includes(i)
			})

			const n = unvisitedNeighbors.length
			if (n > 1) {
				stack.push(currentNode)
			}

			if (n) {
				const i = Math.floor(Math.random() * n)
				const nextNode = unvisitedNeighbors[i]
				const [edge] = this.addEdge(currentNode, nextNode)

				currentNode = nextNode
				nextNode.visited = true
			}

			if (n === 0) {
				currentNode = stack.pop()
			}
		} while (stack.length)
	}

	serialize() {
		return {
			resolution: {
				x: this.resolution.x,
				y: this.resolution.y
			},
			cellSize: this.cellSize,
			nodes: this.nodes.map((node, i) => ({
				index: i,
				neighbors: node.edges.map(edge => {
					const neighbor = edge.from === node ? edge.to : edge.from;
					return this.nodes.indexOf(neighbor);
				})
			}))
		};
	};
}

export class Cell extends Node {
	visited = false

	constructor({ maze }) {
		super()
		this.maze = maze;
	}

	getPositionByIndex() {
		const p = new Vector3(0, 0, 0)
		const { resolution, cellSize } = this.maze

		p.x =
			(this.index % resolution.x) * cellSize -
			(resolution.x * cellSize) / 2 +
			cellSize / 2
		p.z =
			Math.floor(this.index / resolution.x) * cellSize -
			(resolution.y * cellSize) / 2 +
			cellSize / 2

		return p
	}

	getNeighbors() {
		const { resolution } = this.maze

		const topIndex = this.index - resolution.x
		const bottomIndex = this.index + resolution.x
		const leftIndex = this.index - 1
		const rightIndex = this.index + 1

		const neighbors = []

		if (topIndex >= 0) {
			neighbors.push(topIndex)
		}

		if (bottomIndex < resolution.x * resolution.y) {
			neighbors.push(bottomIndex)
		}

		const col = this.index % resolution.x

		if (col !== 0) {
			neighbors.push(leftIndex)
		}

		if (col != resolution.x - 1) {
			neighbors.push(rightIndex)
		}

		return neighbors
	}
}
