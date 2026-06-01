import { describe, it, expect } from 'vitest';
import { buildCommentTree } from '@/components/features/policies/commentTree';

describe('Comment tree utility', () => {
  it('builds a correctly nested hierarchy from flat comments with parent IDs', () => {
    const flatComments = [
      { id: '1', parentId: null, content: 'Root 1' },
      { id: '2', parentId: '1', content: 'Reply to root 1' },
      { id: '3', parentId: '1', content: 'Second reply to root 1' },
      { id: '4', parentId: '2', content: 'Reply to reply' },
      { id: '5', parentId: null, content: 'Root 2' },
      { id: '6', parentId: '5', content: 'Reply to root 2' }
    ];

    const tree = buildCommentTree(flatComments);

    expect(tree).toEqual([
      {
        id: '1',
        parentId: null,
        content: 'Root 1',
        replies: [
          {
            id: '2',
            parentId: '1',
            content: 'Reply to root 1',
            replies: [
              {
                id: '4',
                parentId: '2',
                content: 'Reply to reply',
                replies: []
              }
            ]
          },
          {
            id: '3',
            parentId: '1',
            content: 'Second reply to root 1',
            replies: []
          }
        ]
      },
      {
        id: '5',
        parentId: null,
        content: 'Root 2',
        replies: [
          {
            id: '6',
            parentId: '5',
            content: 'Reply to root 2',
            replies: []
          }
        ]
      }
    ]);
  });

  it('throws an error when a comment references itself as its own parent', () => {
    const flatComments = [
      { id: '1', parentId: '1', content: 'Circular self reference' }
    ];

    expect(() => buildCommentTree(flatComments)).toThrow(
      /Circular reference detected/)
  });
});
