import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
} from 'graphql'
import Build from 'server/models/Build'
import ScreenshotBucketType, {
  resolve as resolveScreenshotBucket,
} from 'server/graphql/ScreenshotBucketType'
import GraphQLDateTime from 'modules/graphQL/GraphQLDateTime'

export const resolve = (source, args) => {
  return Build
    .query()
    .where({
      id: args.id,
    })
    // .eager('screenshotBucket')
    .then(([build]) => {
      return build
    })
}

export const resolveList = (source, args) => {
  return Build
    .query()
    .select('builds.*')
    .innerJoin('repositories', 'repositories.id', 'builds.repositoryId')
    .innerJoin('organizations', 'organizations.id', 'repositories.organizationId')
    .where({
      'repositories.name': args.repositoryName,
      'organizations.name': args.profileName,
    })
    .orderBy('createdAt', 'desc')
    .range(args.after, (args.after + args.first) - 1)
    .then((result) => {
      const hasNextPage = args.after + args.first < result.total

      return {
        pageInfo: {
          totalCount: result.total,
          hasNextPage,
          endCursor: hasNextPage ? args.after + args.first : result.total,
        },
        edges: result.results,
      }
    })
}

const BuildType = new GraphQLObjectType({
  name: 'Build',
  fields: {
    id: {
      type: GraphQLID,
    },
    baseScreenshotBucketId: {
      type: GraphQLString,
    },
    baseScreenshotBucket: {
      type: ScreenshotBucketType,
      resolve: source => (
        resolveScreenshotBucket(source, {
          id: source.baseScreenshotBucketId,
        })
      ),
    },
    compareScreenshotBucketId: {
      type: GraphQLString,
    },
    compareScreenshotBucket: {
      type: ScreenshotBucketType,
      resolve: source => (
        resolveScreenshotBucket(source, {
          id: source.compareScreenshotBucketId,
        })
      ),
    },
    number: {
      description: `
        Continuous number.
        It is increameted after each build for a given repository.
      `,
      type: GraphQLInt,
    },
    createdAt: {
      type: GraphQLDateTime,
    },
    updatedAt: {
      type: GraphQLDateTime,
    },
  },
})

export default BuildType
