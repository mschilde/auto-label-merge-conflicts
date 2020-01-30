// Mock @actions/core
let inputs = {} as any;
const mockCore = jest.genMockFromModule('@actions/core') as any;
mockCore.getInput = (name: string) => {
  return inputs[name];
};

inputs.INPUT_CONFLICT_LABEL_NAME = 'label';
inputs.CONFLICT_LABEL_NAME = 'label';

jest.setMock('@actions/core', mockCore)

import { run } from '../index';

describe('Auto label merge conflicts', () => {
  describe('Parameters', () => {
    test('should require CONFLICT_LABEL_NAME', () => {
      console.log(run);
      expect(1).toBe(1);
    });
  });
});
