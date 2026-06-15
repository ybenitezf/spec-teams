## ADDED Requirements

### Requirement: CI workflow runs on push to main

The project SHALL have a GitHub Actions workflow at `.github/workflows/ci.yml` that triggers on `push` events to the `main` branch.

#### Scenario: Push to main triggers CI
- **WHEN** a commit is pushed to `main`
- **THEN** the CI workflow is triggered automatically
- **AND** the workflow runs `npm ci` followed by `npm test`

### Requirement: CI workflow runs on pull requests targeting main

The CI workflow SHALL trigger on `pull_request` events targeting the `main` branch.

#### Scenario: PR opened against main triggers CI
- **WHEN** a pull request is opened with `main` as the base branch
- **THEN** the CI workflow is triggered automatically
- **AND** the workflow runs the full test suite

#### Scenario: PR updated with new commits triggers CI
- **WHEN** new commits are pushed to a PR branch targeting `main`
- **THEN** the CI workflow is triggered for each new push

### Requirement: CI workflow uses Node.js version matrix

The CI workflow SHALL use a job matrix strategy to test against Node.js versions 20 and 22.
Node 18 is excluded because the Pi SDK (`@earendil-works/pi-coding-agent`) requires Node >=20.6.0.

#### Scenario: Two matrix jobs execute
- **WHEN** the CI workflow is triggered
- **THEN** two parallel jobs are spawned: `20`, and `22`
- **AND** each job executes the same steps independently

#### Scenario: All matrix versions run ubuntu-latest
- **WHEN** the CI workflow executes
- **THEN** each matrix job runs on the `ubuntu-latest` runner

### Requirement: CI workflow uses npm ci for installation

The CI workflow SHALL use `npm ci` (not `npm install`) to install dependencies.

#### Scenario: npm ci is the install step
- **WHEN** the CI workflow job executes
- **THEN** the install step runs `npm ci`
- **AND** the step does not run `npm install`

### Requirement: CI workflow uses setup-node with npm caching

The CI workflow SHALL use `actions/setup-node@v6` with `cache: 'npm'` to enable dependency caching.

#### Scenario: setup-node action is configured with cache
- **WHEN** the workflow YAML is inspected
- **THEN** the `actions/setup-node@v6` step has `cache: 'npm'` set

#### Scenario: Node.js version from matrix is used
- **WHEN** the workflow YAML is inspected
- **THEN** the `node-version` parameter references `${{ matrix.node-version }}`

### Requirement: CI workflow uses checkout@v6

The CI workflow SHALL use `actions/checkout@v6` to clone the repository.

#### Scenario: Checkout step is first
- **WHEN** the workflow YAML is inspected
- **THEN** the first step uses `actions/checkout@v6`

### Requirement: CI workflow has concurrency management

The CI workflow SHALL use GitHub Actions concurrency groups to cancel in-progress runs on the same ref when a new run starts.

#### Scenario: Concurrency group is defined
- **WHEN** the workflow YAML is inspected
- **THEN** a `concurrency` block is defined at the top level
- **AND** the `group` key uses `${{ github.ref }}`
- **AND** `cancel-in-progress` is set to `true`

#### Scenario: Push to main and PR runs have separate concurrency groups
- **WHEN** a push to `main` triggers CI and a PR push also triggers CI
- **THEN** the `main` push is in group `refs/heads/main`
- **AND** the PR push is in group `refs/pull/N/merge`
- **AND** they do not cancel each other

### Requirement: CI workflow has a single job named test

The CI workflow SHALL define a single job named `test` that encompasses the matrix build.

#### Scenario: test job exists
- **WHEN** the workflow YAML is inspected
- **THEN** a job with `name: test` is defined
- **AND** the job runs `npm test` as its test step
