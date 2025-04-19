import express, { NextFunction, Request, Response } from 'express';
import { protect } from '../middleware/auth';
import { Link } from '../models/Link';
import { ClickEvent } from '../models/ClickEvent';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ClickEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The click event's ID
 *         linkId:
 *           type: string
 *           description: The ID of the clicked link
 *         ip:
 *           type: string
 *           description: The IP address of the clicker
 *         country:
 *           type: string
 *           description: The country of the clicker
 *         city:
 *           type: string
 *           description: The city of the clicker
 *         device:
 *           type: string
 *           description: The device type used
 *         browser:
 *           type: string
 *           description: The browser used
 *         os:
 *           type: string
 *           description: The operating system used
 *         referrer:
 *           type: string
 *           description: The referrer URL
 *         utmSource:
 *           type: string
 *           description: UTM source parameter
 *         utmMedium:
 *           type: string
 *           description: UTM medium parameter
 *         utmCampaign:
 *           type: string
 *           description: UTM campaign parameter
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the click occurred
 *     AnalyticsResponse:
 *       type: object
 *       properties:
 *         totalClicks:
 *           type: number
 *           description: Total number of clicks
 *         uniqueCountries:
 *           type: number
 *           description: Number of unique countries
 *         uniqueDevices:
 *           type: number
 *           description: Number of unique devices
 *         uniqueBrowsers:
 *           type: number
 *           description: Number of unique browsers
 *         referrerBreakdown:
 *           type: object
 *           description: Breakdown of traffic sources
 *         countryBreakdown:
 *           type: object
 *           description: Breakdown of traffic by country
 *         deviceBreakdown:
 *           type: object
 *           description: Breakdown of traffic by device
 *         browserBreakdown:
 *           type: object
 *           description: Breakdown of traffic by browser
 *         utmBreakdown:
 *           type: object
 *           properties:
 *             source:
 *               type: object
 *             medium:
 *               type: object
 *             campaign:
 *               type: object
 *         clicks:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ClickEvent'
 */

/**
 * @swagger
 * /api/analytics/links/{linkId}:
 *   get:
 *     summary: Get analytics for a specific link
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: linkId
 *         required: true
 *         schema:
 *           type: string
 *         description: Link ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for analytics (optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for analytics (optional)
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AnalyticsResponse'
 *       404:
 *         description: Link not found
 */
router.get('/links/:linkId', protect, async (req: Request, res: Response, next:NextFunction) => {
  try {
    // Verify link ownership
    const link = await Link.findOne({
      _id: req.params.linkId,
      ownerId: req.user._id
    });

    if (!link) {
      return next(new AppError('Link not found', 404));
    }

    // Get time range from query params
    const { startDate, endDate } = req.query;
    const query: any = { linkId: link._id };

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Get click events
    const clicks = await ClickEvent.find(query)
      .sort('-timestamp');

    // Calculate basic metrics
    const totalClicks = clicks.length;
    const uniqueCountries = new Set(clicks.map(click => click.country)).size;
    const uniqueDevices = new Set(clicks.map(click => click.device)).size;
    const uniqueBrowsers = new Set(clicks.map(click => click.browser)).size;

    // Get referrer breakdown
    const referrerBreakdown = clicks.reduce((acc: any, click) => {
      const referrer = click.referrer || 'Direct';
      acc[referrer] = (acc[referrer] || 0) + 1;
      return acc;
    }, {});

    // Get country breakdown
    const countryBreakdown = clicks.reduce((acc: any, click) => {
      const country = click.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    // Get device breakdown
    const deviceBreakdown = clicks.reduce((acc: any, click) => {
      acc[click.device] = (acc[click.device] || 0) + 1;
      return acc;
    }, {});

    // Get browser breakdown
    const browserBreakdown = clicks.reduce((acc: any, click) => {
      acc[click.browser] = (acc[click.browser] || 0) + 1;
      return acc;
    }, {});

    // Get UTM parameter breakdown
    const utmBreakdown = {
      source: clicks.reduce((acc: any, click) => {
        const source = click.utmSource || 'Direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {}),
      medium: clicks.reduce((acc: any, click) => {
        const medium = click.utmMedium || 'None';
        acc[medium] = (acc[medium] || 0) + 1;
        return acc;
      }, {}),
      campaign: clicks.reduce((acc: any, click) => {
        const campaign = click.utmCampaign || 'None';
        acc[campaign] = (acc[campaign] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      status: 'success',
      data: {
        totalClicks,
        uniqueCountries,
        uniqueDevices,
        uniqueBrowsers,
        referrerBreakdown,
        countryBreakdown,
        deviceBreakdown,
        browserBreakdown,
        utmBreakdown,
        clicks: clicks.slice(0, 100) // Limit to last 100 clicks
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/clicks:
 *   post:
 *     summary: Record a click event
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - linkId
 *             properties:
 *               linkId:
 *                 type: string
 *               ip:
 *                 type: string
 *               country:
 *                 type: string
 *               city:
 *                 type: string
 *               device:
 *                 type: string
 *               browser:
 *                 type: string
 *               os:
 *                 type: string
 *               referrer:
 *                 type: string
 *               utmSource:
 *                 type: string
 *               utmMedium:
 *                 type: string
 *               utmCampaign:
 *                 type: string
 *     responses:
 *       201:
 *         description: Click event recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     clickEvent:
 *                       $ref: '#/components/schemas/ClickEvent'
 *       404:
 *         description: Link not found
 */
router.post('/clicks', async (req: Request, res: Response, next:NextFunction) => {
  try {
    const {
      linkId,
      ip,
      country,
      city,
      device,
      browser,
      os,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign
    } = req.body;

    // Verify link exists
    const link = await Link.findById(linkId);
    if (!link) {
      return next(new AppError('Link not found', 404));
    }

    // Create click event
    const clickEvent = await ClickEvent.create({
      linkId,
      ip,
      country,
      city,
      device,
      browser,
      os,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign
    });

    res.status(201).json({
      status: 'success',
      data: { clickEvent }
    });
  } catch (error) {
    next(error);
  }
});

export const analyticsRoutes = router; 