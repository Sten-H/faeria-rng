"use strict";
import * as helpers from './helpers';

export type CreatureInfo = {toDie: boolean, hp: number, name: number};
export namespace Ping {
    // Creature is represented by an array the length of its hp where each entry is its name
    type Creature = Array<number>;
    type Outcome =  {val: Array<number>, p: number}
    /**
     * A node class used for probability tree
     */
    class Node {
        parent: Node;
        children: Array<Node>;
        value: number;
        probability: number;
        /**
         * @param parent {Node} parent node
         * @param value {number} creature hit (represented by integer, each creature has unique int)
         * @param probability {number} edge probability
         */
        constructor(parent: Node, value: number, probability: number) {
            this.parent = parent;
            this.children = [];
            this.value = value;
            this.probability = probability;
        }

        addChild(node: Node) {
            this.children.push(node);
        }

        /**
         * Recursively collects all leaf nodes under node in tree
         * @param leafNodes
         * @returns {Array<Node>}
         */
        _getLeafNodes(leafNodes: Array<Node> = []): Array<Node> {
            if (this.children.length <= 0) {
                leafNodes.push(this);
            }
            this.children.map((child) => child._getLeafNodes(leafNodes));
            return leafNodes;
        }

        get leafNodes(): Array<Node> {
            return this._getLeafNodes();
        }
        /**
         * Returns an object with the array represented creatures hit in this outcome, and probability of reaching
         * this outcome
         * @returns {Outcome}
         */
        get outcomeWithProbability(): Outcome {
            let p: number = 1,
                outcome: Array<number> = [],
                active: Node = this;
            while (active.parent !== null) {
                outcome.push(active.value);
                p *= active.probability;
                active = active.parent;
            }
            return {val: outcome, p: p};
        }
    }

    /**
     * Creates a tree built with Node objects. Each node has a probability value, to get the probability to arrive at
     * a node you multiply all probabilities from that node up to the root node. The outcome can be found in the same
     * way by traveling to the root while collecting all Node.value
     * @param creatures {Array<Creature>}
     * @param pings {number}
     * @param parentNode {Node}
     */
    function createOutcomeTree(creatures: Array<Creature>, pings: number, parentNode: Node): void {
        if (pings <= 0 || creatures.length <= 0) {
            return;
        }
        creatures.map((_, index) => {
            const probability: number = 1 / creatures.length,
                updatedCreatures: Array<Creature> = helpers.copy(creatures),  // for some reason this needs to be deep copied? Ah array of arrays
                childNode: Node = new Node(parentNode, helpers.nestedPop(updatedCreatures, index), probability);
            parentNode.addChild(childNode);
            createOutcomeTree(updatedCreatures, pings - 1, childNode);
        })
    }

    /**
     * Returns true if creature's damage taken in this outcome is in compliance with creature.toDie
     * For example if creature.toDie = true and damage taken >= creature.hp the outcome is desired.
     * @param creature {CreatureInfo}
     * @param outcome {Outcome} outcome object containing outcome and p variable
     * @returns {boolean}
     */
    function isDesiredOutcome(creature: CreatureInfo, outcome: Outcome): boolean {
        const dmg: number = outcome.val.reduce((acc, val) => {
            if (val === creature.name)
                return acc + 1;
            else return acc;
        }, 0);
        return ((creature.toDie && dmg >= creature.hp) || (!creature.toDie && dmg < creature.hp));
    }

    /**
     * Filters outcomes to only outcomes that have desired results
     * @param creatures {Array<CreatureInfo>} array with creature objects
     * @param outcomes {Array<Outcome>} array of outcomes
     * @returns {Array<Outcome>}
     */
    function filterOutcomes(creatures: Array<CreatureInfo>, outcomes: Array<Outcome>): Array<Outcome> {
        if (creatures.length === 0)
            return outcomes;
        const [creature, ...remaining] = creatures,
            filtered = outcomes.filter((outcome) => isDesiredOutcome(creature, outcome));
        return filterOutcomes(remaining, filtered);
    }
    /**
     * Creates an array with nested arrays. The nested arrays are filled with creature.name entered as many times as it
     * has hp. When a creature takes damage one instance of creature.name is popped from its array to the outcome.
     * @param creatures {Array<CreatureInfo>}
     * @returns {Array<Array<int>>}
     */
    function getCreatureArray(creatures: Array<CreatureInfo>): Array<Creature> {
        return creatures.map((c) => {
            return Array(c.hp).fill(c.name);
        });
    }
    export function calculate(creatureInput: Array<CreatureInfo>, pings: number) {
        const creatures: Array<Creature> = getCreatureArray(creatureInput),
            root: Node = new Node(null, null, 1.0);
        createOutcomeTree(creatures, pings, root);
        const leafNodes: Array<Node> = root.leafNodes,
            outcomes: Array<Outcome> = leafNodes.map((leaf) => leaf.outcomeWithProbability),
            filteredOutcomes: Array<Outcome> = filterOutcomes(creatureInput, outcomes),
            summedProbability: number = filteredOutcomes.reduce((acc, outcome) => acc + outcome.p, 0);
        return summedProbability;
    }
}