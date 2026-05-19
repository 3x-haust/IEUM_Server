import { normalizeText } from '../../common/utils/text-normalizer';

type Node = { next: Map<string, Node>; fail: Node | null; outputs: string[] };

export class AhoCorasickMatcher {
  private readonly root: Node = { next: new Map(), fail: null, outputs: [] };

  constructor(words: string[]) {
    for (const word of words.map(normalizeText).filter(Boolean)) {
      this.insert(word);
    }
    this.buildFailures();
  }

  find(value: string): string[] {
    const normalized = normalizeText(value);
    const matches = new Set<string>();
    let node = this.root;
    for (const char of normalized) {
      while (node !== this.root && !node.next.has(char)) {
        node = node.fail ?? this.root;
      }
      node = node.next.get(char) ?? this.root;
      for (const output of node.outputs) {
        matches.add(output);
      }
    }
    return [...matches];
  }

  private insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      let next = node.next.get(char);
      if (!next) {
        next = { next: new Map(), fail: null, outputs: [] };
        node.next.set(char, next);
      }
      node = next;
    }
    node.outputs.push(word);
  }

  private buildFailures(): void {
    const queue: Node[] = [];
    for (const child of this.root.next.values()) {
      child.fail = this.root;
      queue.push(child);
    }
    while (queue.length) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      for (const [char, child] of current.next.entries()) {
        let failure = current.fail;
        while (failure && failure !== this.root && !failure.next.has(char)) {
          failure = failure.fail;
        }
        child.fail = failure?.next.get(char) ?? this.root;
        child.outputs.push(...child.fail.outputs);
        queue.push(child);
      }
    }
  }
}
