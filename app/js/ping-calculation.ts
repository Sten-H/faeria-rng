"use strict";
import * as helpers from './helpers';

export type CreatureInfo = {toDie: boolean, hp: number, name: number};
export namespace Ping {
    // Creature is represented by an array the length of its hp where each entry is its name
    type Creature = Array<number>;
    // Each entry in val array is 'name' of creature hit
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


        // Recursively collects all leaf nodes under node in tree
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
        // Recursively travels up the tree from node creating an Outcome object
        _getOutcome(outcome: Array<number> = [], p: number=1): Outcome {
            if(this.parent === null) {
                return {val: outcome, p: p}
            } else {
                return this.parent._getOutcome(outcome.concat(this.value), p * this.probability);
            }
        }
        /**
         * Returns an Outcome representing creatures hit and probability of reaching this outcome
         * @returns {Outcome}
         */
        get outcome(): Outcome {
            return this._getOutcome();
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
                updatedCreatures: Array<Creature> = helpers.copy(creatures),
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
        return creatures.reduce((acc, c) =>
            acc.filter(outcome =>
                isDesiredOutcome(c, outcome)),
            outcomes);
    }
    export function calculate(creatureInput: Array<CreatureInfo>, pings: number) {
        // Each Creature is represented as an array with length = hp and filled with its name on each entry
        const creatures: Array<Creature> = creatureInput.map(c => Array(c.hp).fill(c.name)),
            root: Node = new Node(null, null, 1.0);
        createOutcomeTree(creatures, pings, root);
        const leafNodes: Array<Node> = root.leafNodes,
            outcomes: Array<Outcome> = leafNodes.map((leaf) => leaf.outcome),
            filteredOutcomes: Array<Outcome> = filterOutcomes(creatureInput, outcomes),
            summedProbability: number = filteredOutcomes.reduce((acc, outcome) => acc + outcome.p, 0);
        return summedProbability;
    }
}