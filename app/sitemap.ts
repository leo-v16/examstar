import { MetadataRoute } from 'next';
import { getAllExamIdsAction } from '@/app/actions';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://exam-star.vercel.app';

  const now = new Date();

  // Public static routes only
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  // Dynamic exam routes
  const examResult = await getAllExamIdsAction();
  const examRoutes: MetadataRoute.Sitemap = (examResult.data || []).map(
    (examId) => ({
      url: `${baseUrl}/exam/${examId}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  );

  return [...staticRoutes, ...examRoutes];
}
