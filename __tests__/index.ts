// Mock @actions/core
const inputs = {} as any;
const mockCore = jest.genMockFromModule('@actions/core') as any;
mockCore.getInput = (name: string) => {
  return inputs[name];
};
inputs.INPUT_CONFLICT_LABEL_NAME = 'label';
inputs.CONFLICT_LABEL_NAME = 'label';
const spy = jest.spyOn(mockCore, 'getInput');
jest.setMock('@actions/core', mockCore);

import { run } from '../lib/main';

describe('Auto label merge conflicts', () => {
  afterAll(() => {
    jest.unmock('@actions/core');
  });

  describe('Parameters', () => {
    test('should require CONFLICT_LABEL_NAME', async () => {
      await run();
      expect(spy).toHaveBeenCalled();
    });
  });
});
