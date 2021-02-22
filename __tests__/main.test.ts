import * as core from '@actions/core'
import * as github from '@actions/github'
import nock from 'nock'

import {wait} from '../src/wait'
import {getLabels} from '../src/queries'

test('throws invalid number', async () => {
  const input = parseInt('foo', 10)
  await expect(wait(input)).rejects.toThrow('milliseconds not a number')
})

test('wait 500 ms', async () => {
  const start = new Date()
  await wait(500)
  const end = new Date()
  var delta = Math.abs(end.getTime() - start.getTime())
  expect(delta).toBeGreaterThan(450)
})

// Inputs for mock @actions/core
let inputs = {} as any

// Shallow clone original @actions/github context
let originalContext = {...github.context}

describe('input-helper tests', () => {
  beforeAll(() => {
    // Mock getInput
    jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
      return inputs[name]
    })

    // Mock error/warning/info/debug
    jest.spyOn(core, 'error').mockImplementation(jest.fn())
    jest.spyOn(core, 'warning').mockImplementation(jest.fn())
    jest.spyOn(core, 'info').mockImplementation(jest.fn())
    jest.spyOn(core, 'debug').mockImplementation(jest.fn())

    // Mock github context
    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner: 'some-owner',
        repo: 'some-repo'
      }
    })
    github.context.ref = 'refs/heads/some-ref'
    github.context.sha = '1234567890123456789012345678901234567890'
  })

  beforeEach(() => {
    // Reset inputs
    inputs = {}
  })

  afterAll(() => {
    // Restore @actions/github context
    github.context.ref = originalContext.ref
    github.context.sha = originalContext.sha

    // Restore
    jest.restoreAllMocks()
  })

  it('gets a matching label', async () => {
    const scope = nock('https://api.github.com', {
      reqheaders: {
        authorization: 'token justafaketoken'
      }
    })
      .post('/graphql')
      .reply(200, {data: {repository: {labels: {edges: [{node: {id: '1654984416', name: 'expected_label'}}]}}}})

    const conflictLabelName = 'expected_label'
    const myToken = 'justafaketoken'
    const octokit = github.getOctokit(myToken)

    const labels = await getLabels(octokit, github.context, conflictLabelName)

    expect(labels.repository.labels.edges.length).toBe(1)
    expect(labels.repository.labels.edges[0].node.id).toBe('1654984416')
    expect(labels.repository.labels.edges[0].node.name).toBe('expected_label')
  })

  it('gets many similar label', async () => {
    const scope = nock('https://api.github.com', {
      reqheaders: {
        authorization: 'token justafaketoken'
      }
    })
      .post('/graphql')
      .reply(200, {
        data: {
          repository: {
            labels: {
              edges: [
                {node: {id: 'MDU6TGFiZWwyNzYwMjE1ODI0', name: 'dependencies'}},
                {node: {id: 'MDU6TGFiZWwyNzYwMjEzNzMw', name: 'wontfix'}}
              ]
            }
          }
        }
      })

    const conflictLabelName = 'expected_label'
    const myToken = 'justafaketoken'
    const octokit = github.getOctokit(myToken)

    const labels = await getLabels(octokit, github.context, conflictLabelName)

    expect(labels.repository.labels.edges.length).toBe(2)
    expect(labels.repository.labels.edges[0].node.id).toBe('MDU6TGFiZWwyNzYwMjE1ODI0')
    expect(labels.repository.labels.edges[0].node.name).toBe('dependencies')
    // typescript is undefined but it's there at runtime
  })
})
