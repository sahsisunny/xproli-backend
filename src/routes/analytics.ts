import express, { NextFunction, Request, Response } from 'express';
import { protect } from '../middleware/auth';
import { Link } from '../models/Link';
import { ClickEvent } from '../models/ClickEvent';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();

// Get analytics for a specific link
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

// Record click event
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