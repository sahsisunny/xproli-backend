import express, { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { nanoid } from 'nanoid';
import { Link } from '../models/Link';
import { AppError } from '../middleware/errorHandler';
import { protect } from '../middleware/auth';
import { ClickEvent } from '../models/ClickEvent';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Link:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The link's ID
 *         ownerId:
 *           type: string
 *           description: The ID of the user who owns the link
 *         domain:
 *           type: string
 *           description: The domain for the short URL
 *         slug:
 *           type: string
 *           description: The unique identifier for the short URL
 *         destinationUrl:
 *           type: string
 *           description: The original URL that will be redirected to
 *         title:
 *           type: string
 *           description: Optional title for the link
 *         description:
 *           type: string
 *           description: Optional description for the link
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Optional tags for categorizing the link
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Optional expiration date for the link
 *         passwordProtected:
 *           type: boolean
 *           description: Whether the link is password protected
 *         password:
 *           type: string
 *           description: Optional password for the link
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the link was created
 *     LinkStats:
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
 *         recentClicks:
 *           type: array
 *           items:
 *             type: object
 */

// Link validation
const linkValidation = [
  body('destinationUrl')
    .isURL()
    .withMessage('Please provide a valid URL'),
  body('domain')
    .optional()
    .isString()
    .withMessage('Domain must be a string'),
  body('slug')
    .optional()
    .isString()
    .matches(/^[a-zA-Z0-9-_]+$/)
    .withMessage('Slug can only contain letters, numbers, hyphens, and underscores'),
  body('title')
    .optional()
    .isString()
    .withMessage('Title must be a string'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be a valid date'),
  body('passwordProtected')
    .optional()
    .isBoolean()
    .withMessage('Password protected must be a boolean'),
  body('password')
    .optional()
    .isString()
    .withMessage('Password must be a string')
];

/**
 * @swagger
 * /api/links:
 *   post:
 *     summary: Create a new short link
 *     tags: [Links]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - destinationUrl
 *             properties:
 *               destinationUrl:
 *                 type: string
 *                 format: uri
 *               domain:
 *                 type: string
 *               slug:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               passwordProtected:
 *                 type: boolean
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Link created successfully
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
 *                     link:
 *                       $ref: '#/components/schemas/Link'
 *       400:
 *         description: Invalid input or slug already in use
 */
router.post('/', protect, linkValidation, async (req: Request, res: Response, next:NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      destinationUrl,
      domain = 'xpro.li',
      slug = nanoid(8),
      title,
      description,
      tags,
      expiresAt,
      passwordProtected,
      password
    } = req.body;

    // Check if slug is available
    const existingLink = await Link.findOne({ domain, slug });
    if (existingLink) {
      return next(new AppError('Slug already in use', 400));
    }

    // Create link
    const link = await Link.create({
      ownerId: req.user._id,
      domain,
      slug,
      destinationUrl,
      title,
      description,
      tags,
      expiresAt,
      passwordProtected,
      password
    });

    res.status(201).json({
      status: 'success',
      data: { link }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/links:
 *   get:
 *     summary: Get all links for the authenticated user
 *     tags: [Links]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of links with statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 results:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       destinationUrl:
 *                         type: string
 *                       shortUrl:
 *                         type: string
 *                       stats:
 *                         $ref: '#/components/schemas/LinkStats'
 */
router.get('/', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const links = await Link.find({ ownerId: req.user._id })
      .sort('-createdAt')
      .lean();

      // get the backend url from the environment variable
      const backendBaseUrl = process.env.BACKEND_URL || 'https://xpro.li';

    // Process each link to include real-time stats
    const linksWithStats = await Promise.all(links.map(async (link) => {
      // Get click events for this link
      const clicks = await ClickEvent.find({ linkId: link._id });
      
      // Calculate statistics similar to analytics endpoint
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

      const shortUrl = link.domain !== 'xpro.li' 
      ? `https://${link.domain}/${link.slug}`  // Custom domain case
      : `${backendBaseUrl}/${link.slug}`;      // Default domain case


      return {
        id: link._id,
        slug: link.slug,
        destinationUrl: link.destinationUrl,
        title: link.title,
        shortUrl,  // Added the shortUrl field
        description: link.description,
        tags: link.tags,
        expiresAt: link.expiresAt,
        passwordProtected: link.passwordProtected,
        password: link.password,
        stats: {
          totalClicks,
          uniqueCountries,
          uniqueDevices,
          uniqueBrowsers,
          referrerBreakdown,
          countryBreakdown,
          deviceBreakdown,
          browserBreakdown,
          utmBreakdown,
          recentClicks: clicks.slice(0, 5) // Include 5 most recent clicks
        },
        createdAt: link.createdAt
      };
    }));

    res.json({
      status: 'success',
      results: linksWithStats.length,
      data: linksWithStats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/links/{id}:
 *   get:
 *     summary: Get a single link by ID
 *     tags: [Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Link ID
 *     responses:
 *       200:
 *         description: Link details
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
 *                     link:
 *                       $ref: '#/components/schemas/Link'
 *       404:
 *         description: Link not found
 */
router.get('/:id', protect, async (req: Request, res: Response, next:NextFunction) => {
  try {
    const link = await Link.findOne({
      _id: req.params.id,
      ownerId: req.user._id
    });

    if (!link) {
      return next(new AppError('Link not found', 404));
    }

    res.json({
      status: 'success',
      data: { link }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/links/{id}:
 *   patch:
 *     summary: Update a link
 *     tags: [Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Link ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Link'
 *     responses:
 *       200:
 *         description: Link updated successfully
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
 *                     link:
 *                       $ref: '#/components/schemas/Link'
 *       404:
 *         description: Link not found
 */
router.patch('/:id', protect, linkValidation, async (req: Request, res: Response, next:NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const link = await Link.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerId: req.user._id
      },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!link) {
      return next(new AppError('Link not found', 404));
    }

    res.json({
      status: 'success',
      data: { link }
    });
  } catch (error) {
    next(error);
  }
});

// Delete link
router.delete('/:id', protect, async (req: Request, res: Response, next:NextFunction) => {
  try {
    const link = await Link.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id
    });

    if (!link) {
      return next(new AppError('Link not found', 404));
    }

    res.json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
});

// Redirect route (public)
// router.get('/:domain/:slug', async (req: Request, res: Response, next:NextFunction) => {
//   try {
//     const { domain, slug } = req.params;

//     const link = await Link.findOne({ domain, slug });

//     if (!link) {
//       return next(new AppError('Link not found', 404));
//     }

//     // Check if link is expired
//     if (link.expiresAt && link.expiresAt < new Date()) {
//       return next(new AppError('Link has expired', 410));
//     }

//     // Check if password protected
//     if (link.passwordProtected) {
//       const password = req.query.password as string;
//       if (!password || password !== link.password) {
//         return res.status(401).json({
//           status: 'error',
//           message: 'Password required'
//         });
//       }
//     }

//     res.redirect(link.destinationUrl);
//   } catch (error) {
//     next(error);
//   }
// });

export const linkRoutes = router; 