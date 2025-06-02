import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/.server/request-auth.server';
import {
  getProjectById,
  updateProject,
  deleteProject,
  type Project,
} from '~/lib/.server/db/project.server.ts';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const project = await getProjectById(projectId, user.id);
    if (!project) {
      return json({ error: 'Project not found or access denied' }, { status: 404 });
    }
    return json({ project });
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    return json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    if (request.method === 'PATCH' || request.method === 'PUT') {
      const formData = await request.formData();
      const updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {};

      // Iterate over formData to build updates object
      // This allows for flexible partial updates
      if (formData.has('name')) updates.name = formData.get('name') as string;
      if (formData.has('description')) updates.description = formData.get('description') as string | undefined;
      if (formData.has('previewUrl')) updates.preview_url = formData.get('previewUrl') as string | undefined;
      
      if (formData.has('codeContent')) {
        const codeContentString = formData.get('codeContent') as string | undefined;
        if (codeContentString) {
          try {
            updates.code_content = JSON.parse(codeContentString);
          } catch (e) {
            return json({ error: 'Invalid JSON format for codeContent' }, { status: 400 });
          }
        } else {
          updates.code_content = null; // Explicitly set to null if empty string sent
        }
      }
      
      if (Object.keys(updates).length === 0) {
        return json({ error: 'No update fields provided' }, { status: 400 });
      }

      const updatedProject = await updateProject(projectId, user.id, updates);

      if (!updatedProject) {
        return json({ error: 'Failed to update project or project not found/access denied' }, { status: 404 });
      }
      return json({ project: updatedProject });

    } else if (request.method === 'DELETE') {
      const result = await deleteProject(projectId, user.id);
      if (!result.success) {
        const status = result.message?.includes('not found') ? 404 : 500;
        return json({ error: result.message || 'Failed to delete project' }, { status });
      }
      return json({ message: 'Project deleted successfully' });

    } else {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }
  } catch (error) {
    console.error(`Error processing request for project ${projectId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return json({ error: errorMessage }, { status: 500 });
  }
}
