import { convertRestApiFormat, convertGraphQLFormat, TaskFormat } from './taskConverter';
import { PROJECT_KEYS } from '@/config/projectKeys';

describe('taskConverter', () => {
  describe('convertRestApiFormat', () => {
    it('converts a complete REST API issue to TaskFormat', () => {
      const source = {
        node_id: 'issue-123',
        title: 'Test Issue',
        number: 42,
        repository_url: 'https://api.github.com/repos/owner/repo',
        labels: [{ name: 'bug' }, { name: 'priority-high' }],
        assignees: [{ login: 'user1' }, { login: 'user2' }],
        milestone: { title: 'v1.0' },
        state: 'open',
        body: 'Issue description',
        html_url: 'https://github.com/owner/repo/issues/42',
        created_at: '2024-01-15T10:00:00Z'
      };

      const result = convertRestApiFormat(source);

      expect(result.id).toBe('issue-123');
      expect(result.title).toBe('Test Issue');
      expect(result.issue_number).toBe(42);
      expect(result.repository).toBe('repo');
      expect(result.repo_owner).toBe('owner');
      expect(result.labels).toEqual(['bug', 'priority-high']);
      expect(result.assignees).toEqual(['user1', 'user2']);
      expect(result.milestone).toBe('v1.0');
      expect(result.Title).toBe('Test Issue');
      expect(result.Status).toBe('Todo');
      expect(result.number).toBe(42);
      expect(result.body).toBe('Issue description');
      expect(result.state).toBe('open');
      expect(result.html_url).toBe('https://github.com/owner/repo/issues/42');
      expect(result.createdAt).toBe('2024-01-15T10:00:00Z');
      expect(result.links).toEqual([]);
    });

    it('converts closed issue to Done status', () => {
      const source = {
        state: 'closed',
        title: 'Closed Issue'
      };

      const result = convertRestApiFormat(source);

      expect(result.Status).toBe('Done');
    });

    it('handles missing fields gracefully', () => {
      const source = {};

      const result = convertRestApiFormat(source);

      expect(result.id).toBeNull();
      expect(result.title).toBeNull();
      expect(result.issue_number).toBeNull();
      expect(result.repository).toBeNull();
      expect(result.repo_owner).toBeNull();
      expect(result.labels).toEqual([]);
      expect(result.assignees).toEqual([]);
      expect(result.milestone).toBeNull();
      expect(result.Status).toBe('Todo');
      expect(result[PROJECT_KEYS.SPRINT]).toBeNull();
      expect(result[PROJECT_KEYS.SIZE]).toBeNull();
      expect(result[PROJECT_KEYS.ESTIMATE_DAYS]).toBeNull();
      expect(result[PROJECT_KEYS.ACTUAL_DAYS]).toBeNull();
    });

    it('extracts repository from repository_url by splitting on "/"', () => {
      const source = {
        repository_url: 'invalid-url'
      };

      const result = convertRestApiFormat(source);

      // .split('/').pop() gives 'invalid-url', [4] gives undefined
      expect(result.repository).toBe('invalid-url');
      expect(result.repo_owner).toBeNull();
    });

    it('handles empty arrays for labels and assignees', () => {
      const source = {
        labels: [],
        assignees: []
      };

      const result = convertRestApiFormat(source);

      expect(result.labels).toEqual([]);
      expect(result.assignees).toEqual([]);
    });
  });

  describe('convertGraphQLFormat', () => {
    it('converts a complete GraphQL item to TaskFormat', () => {
      const source = {
        id: 'graphql-id-123',
        title: 'GraphQL Issue',
        issue_number: 99,
        repository: 'test-repo',
        repo_owner: 'test-owner',
        labels: ['enhancement', 'frontend'],
        assignees: ['dev1', 'dev2'],
        Status: 'In Progress',
        body: 'Issue body',
        html_url: 'https://github.com/test-owner/test-repo/issues/99',
        links: [{ id: 'link-1', type: 'blocks', url: 'https://github.com/test-owner/test-repo/issues/100' }],
        customField1: 'custom value',
        [PROJECT_KEYS.SPRINT]: 'Sprint-5',
        [PROJECT_KEYS.SIZE]: 'Large'
      };

      const result = convertGraphQLFormat(source);

      expect(result.id).toBe('graphql-id-123');
      expect(result.title).toBe('GraphQL Issue');
      expect(result.issue_number).toBe(99);
      expect(result.repository).toBe('test-repo');
      expect(result.repo_owner).toBe('test-owner');
      expect(result.labels).toEqual(['enhancement', 'frontend']);
      expect(result.assignees).toEqual(['dev1', 'dev2']);
      expect(result.Status).toBe('In Progress');
      expect(result.Title).toBe('GraphQL Issue');
      expect(result.number).toBe(99);
      expect(result.body).toBe('Issue body');
      expect(result.state).toBe('In Progress');
      expect(result.html_url).toBe('https://github.com/test-owner/test-repo/issues/99');
      expect(result.links).toHaveLength(1);
      expect(result.customField1).toBe('custom value');
      expect(result[PROJECT_KEYS.SPRINT]).toBe('Sprint-5');
      expect(result[PROJECT_KEYS.SIZE]).toBe('Large');
    });

    it('handles missing fields with defaults', () => {
      const source = {};

      const result = convertGraphQLFormat(source);

      expect(result.id).toBeNull();
      expect(result.title).toBeNull();
      expect(result.issue_number).toBeNull();
      expect(result.repository).toBeNull();
      expect(result.repo_owner).toBeNull();
      expect(result.labels).toEqual([]);
      expect(result.assignees).toEqual([]);
      expect(result.Status).toBe('Todo');
      expect(result.links).toEqual([]);
    });

    it('preserves all source fields via spread operator', () => {
      const source = {
        id: 'id-1',
        title: 'Test',
        extraField1: 'value1',
        extraField2: 'value2',
        nested: { prop: 'nested value' }
      };

      const result = convertGraphQLFormat(source);

      expect(result.extraField1).toBe('value1');
      expect(result.extraField2).toBe('value2');
      expect(result.nested).toEqual({ prop: 'nested value' });
    });

    it('defaults Status to Todo when not provided, state maps from source.Status', () => {
      const source = {
        title: 'No status issue'
      };

      const result = convertGraphQLFormat(source);

      expect(result.Status).toBe('Todo');
      // state: source.Status || null → null when source.Status is undefined
      expect(result.state).toBeNull();
    });

    it('maps issue_number to number field', () => {
      const source = {
        issue_number: 456
      };

      const result = convertGraphQLFormat(source);

      expect(result.number).toBe(456);
    });
  });
});
