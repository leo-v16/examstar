import { MetadataRoute } from 'next';
import { getAllExamIdsAction } from '@/app/actions';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://exam-star.vercel.app'; // Fallback to a default if not set

  // Static routes
  const routes = [
    '',
    '/login',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1,
  }));

  // Dynamic exam routes
  const examResult = await getAllExamIdsAction();
  const examRoutes = (examResult.data || []).map((examId) => ({
    url: `${baseUrl}/exam/${examId}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...routes, ...examRoutes];
}
