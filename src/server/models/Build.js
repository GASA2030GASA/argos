import { ValidationError } from 'objection'
import BaseModel from 'server/models/BaseModel'
import reduceJobStatus from 'modules/jobs/reduceJobStatus'
import User from './User'
import ScreenshotDiff from './ScreenshotDiff'

export default class Build extends BaseModel {
  static tableName = 'builds';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'compareScreenshotBucketId',
      'repositoryId',
      'jobStatus',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      jobStatus: {
        type: 'string',
        enum: [
          'pending',
          'progress',
          'complete',
          'error',
        ],
      },
      baseScreenshotBucketId: { types: ['string', null] },
      compareScreenshotBucketId: { type: 'string' },
      repositoryId: { type: 'string' },
      number: { type: 'integer' },
    },
  };

  static relationMappings = {
    baseScreenshotBucket: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'ScreenshotBucket',
      join: {
        from: 'builds.baseScreenshotBucketId',
        to: 'screenshot_buckets.id',
      },
    },
    compareScreenshotBucket: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'ScreenshotBucket',
      join: {
        from: 'builds.compareScreenshotBucketId',
        to: 'screenshot_buckets.id',
      },
    },
    repository: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Repository',
      join: {
        from: 'builds.repositoryId',
        to: 'repositories.id',
      },
    },
  };

  $afterValidate(json) { // eslint-disable-line class-methods-use-this
    if (json.baseScreenshotBucketId &&
      json.baseScreenshotBucketId === json.compareScreenshotBucketId) {
      throw new ValidationError(
        'The base screenshot bucket should be different to the compare one.',
      )
    }
  }

  $toDatabaseJson() {
    const attributes = super.$toDatabaseJson()
    attributes.number = this.$knex().raw(
      '(select coalesce(max(number),0) + 1 as number from builds where "repositoryId" = ?)',
      attributes.repositoryId,
    )

    return attributes
  }

  static async getStatus(buildId) {
    const screenshotDiffs = await ScreenshotDiff.query().where({ buildId })
    const jobStatus = reduceJobStatus(screenshotDiffs.map(({ jobStatus }) => jobStatus))

    if (jobStatus === 'complete') {
      const hasDiffs = screenshotDiffs.some(({ score }) => score > 0)
      return hasDiffs ? 'failure' : 'success'
    }

    return jobStatus
  }

  static async getUsers(buildId) {
    return User.query()
      .select('users.*')
      .join('user_repository_rights', 'users.id', '=', 'user_repository_rights.userId')
      .join('repositories', 'user_repository_rights.repositoryId', '=', 'repositories.id')
      .join('builds', 'repositories.id', '=', 'builds.repositoryId')
      .where('builds.id', buildId)
  }

  async getUsers() {
    return this.constructor.getUsers(this.id)
  }

  async getStatus() {
    return this.constructor.getStatus(this.id)
  }
}
