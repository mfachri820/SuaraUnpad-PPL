export interface FlatComment {
  id: string;
  parentId?: string | null;
  content: string;
  [key: string]: unknown;
}

export type NestedComment<T extends FlatComment = FlatComment> = T & {
  replies: NestedComment<T>[];
};

export function buildCommentTree<T extends FlatComment>(comments: T[]): NestedComment<T>[] {
  const nodes = new Map<string, NestedComment<T>>();
  const roots: NestedComment<T>[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  comments.forEach((comment) => {
    nodes.set(comment.id, {
      ...comment,
      replies: []
    });
  });

  const attach = (node: NestedComment<T>) => {
    if (visited.has(node.id)) return;
    if (inStack.has(node.id)) {
      throw new Error(`Circular reference detected for comment ${node.id}`);
    }

    inStack.add(node.id);

    if (node.parentId && node.parentId !== node.id) {
      const parent = nodes.get(node.parentId);
      if (parent) {
        attach(parent);
        parent.replies.push(node);
      } else {
        roots.push(node);
      }
    } else if (node.parentId === node.id) {
      throw new Error(`Circular reference detected for comment ${node.id}`);
    } else {
      roots.push(node);
    }

    inStack.delete(node.id);
    visited.add(node.id);
  };

  nodes.forEach((node) => attach(node));
  return roots;
}
