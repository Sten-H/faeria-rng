"use strict";

export type CreatureInfo = {toDie: boolean, hp: number, id: number};
export namespace Ping {
    type Creature = {id: number, hp: number};
    // Each entry in val array is 'id' of targeted creature
    type Outcome =  {val: ReadonlyArray<number>, p: number}
    // Node is a node in probability tree
    type Node = {p: number, target: number, children: ReadonlyArray<Node>}

    function pingCreature(creature: Creature) {
        return {
            id: creature.id,
            hp: creature.hp - 1
        };
    }
    function _createOutcomeTree(creatures: ReadonlyArray<Creature>, pings: number): Array<Node> {
        if (pings <= 0 || creatures.length <= 0) {
            return [];
        }
        return creatures.map((targetCreature, index) => {
            const probability = 1 / creatures.length,
                targetId: number = targetCreature.id,
                creaturesAfterPing = creatures
                    .map((creature, i) => (i === index) ? pingCreature(creature) : creature)
                    .filter(creature => creature.hp !== 0);  // Filter out tree root value (-1) from outcomes
            return {p: probability, target: targetId, children: _createOutcomeTree(creaturesAfterPing, pings - 1)}
        });
    }
    /**
     * Creates a probability tree. Each node has a probability value, to get the probability to arrive at
     * a node you multiply all probabilities from that node up to the root node. The outcome can be found in the same
     * way by traveling to the root while collecting all target values
     * @param creatures {ReadonlyArray<Creature>}
     * @param pings {number}
     * @param parentNode {Node}
     * @return {Node} returns the root node of the tree
     */
    function createOutcomeTree(creatures: ReadonlyArray<Creature>, pings: number): Node {
        return {target: -1, p: 1, children: _createOutcomeTree(creatures, pings)};
    }

    /**
     * Traverses tree down to leaf nodes and collects all outcomes and returns them as an array of outcomes
     * @param currentNode {Node}    current node being traversed
     * @param target {ReadonlyArray<number>} accumulated targets hit while traversing down tree
     * @param p {number}    accumulated probability while traversing down tree
     * @returns {ReadonlyArray<Outcome>}
     */
    function getOutcomes(currentNode: Node, target: ReadonlyArray<number>=[], p: number=1): ReadonlyArray<Outcome> {
        if(currentNode.children.length === 0) {
            return [{val: target.concat(currentNode.target)
                .filter(targetVal => targetVal !== -1), p: p * currentNode.p}];
        }
        return [].concat( ...currentNode.children.map(child => {
            return getOutcomes(child, target.concat(currentNode.target), p * currentNode.p);
        }));
    }
    /**
     * Returns true if creature's damage taken in this outcome is in compliance with creature.toDie
     * For example if creature.toDie = true and damage taken >= creature.hp the outcome is desired.
     * @param creature {CreatureInfo}
     * @param outcome {Outcome} outcome object containing outcome and p variable
     * @returns {boolean}
     */
    function isDesiredOutcome(creature: CreatureInfo, outcome: Outcome): boolean {
        const dmg = outcome.val.reduce((acc, val) => {
            if (val === creature.id)
                return acc + 1;
            else return acc;
        }, 0);
        return ((creature.toDie && dmg >= creature.hp) || (!creature.toDie && dmg < creature.hp));
    }

    /**
     * Filters outcomes to only outcomes that have desired results
     * @param creatureInputs {ReadonlyArray<CreatureInfo>} array with creature objects
     * @param outcomes {ReadonlyArray<Outcome>} array of outcomes
     * @returns {ReadonlyArray<Outcome>}
     */
    function filterOutcomes(creatureInputs: ReadonlyArray<CreatureInfo>, outcomes: ReadonlyArray<Outcome>): ReadonlyArray<Outcome> {
        return creatureInputs.reduce((acc, c) =>
                acc.filter(outcome => isDesiredOutcome(c, outcome)),
            outcomes);
    }
    export function calculate(creatureInput: ReadonlyArray<CreatureInfo>, pings: number): number {
        const creatures: ReadonlyArray<Creature> = creatureInput.map(c => ({id: c.id, hp: c.hp})),
            root = createOutcomeTree(creatures, pings),
            outcomes = getOutcomes(root),
            filteredOutcomes = filterOutcomes(creatureInput, outcomes),
            summedProbability = filteredOutcomes.reduce((acc, outcome) => acc + outcome.p, 0);
        return summedProbability;
    }
}