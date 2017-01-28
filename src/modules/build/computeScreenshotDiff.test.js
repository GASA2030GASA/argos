import S3 from 'aws-sdk/clients/s3'
import { useDatabase } from 'server/testUtils'
import ScreenshotBucket from 'server/models/ScreenshotBucket'
import ScreenshotDiff from 'server/models/ScreenshotDiff'
import Build from 'server/models/Build'
import Screenshot from 'server/models/Screenshot'
import computeScreenshotDiff from './computeScreenshotDiff'

describe('computeScreenshotDiff', () => {
  useDatabase()

  let s3
  let screenshotDiff

  beforeEach(async () => {
    s3 = new S3({ signatureVersion: 'v4' })

    const [compareBucket, baseBucket] = await ScreenshotBucket.query()
      .insert([
        {
          name: 'test-bucket',
          commit: 'a',
          branch: 'test-branch',
        },
        {
          name: 'base-bucket',
          commit: 'b',
          branch: 'master',
        },
      ])

    const build = await Build.query()
      .insert({
        baseScreenshotBucketId: baseBucket.id,
        compareScreenshotBucketId: compareBucket.id,
      })

    const [compareScreenshot, baseScreenshot] = await Screenshot.query()
      .insert([
        {
          name: 'penelope-argos',
          s3Id: 'penelope-argos.jpg',
          screenshotBucketId: compareBucket.id,
        },
        {
          name: 'penelope',
          s3Id: 'penelope.jpg',
          screenshotBucketId: baseBucket.id,
        },
      ])

    screenshotDiff = await ScreenshotDiff.query()
      .insert({
        buildId: build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        jobStatus: 'pending',
        validationStatus: 'unknown',
      })
  })

  it('should process diff an update screen shot diff', async () => {
    const resultScreenshotDiff = await computeScreenshotDiff(screenshotDiff.id, {
      s3,
      bucket: 'argos-screenshots-sandbox',
    })
    console.log(resultScreenshotDiff)
  })
})
