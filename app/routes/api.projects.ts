import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/.server/request-auth.server';
import { createProject, getProjectsByUserId } from '~/lib/.server/db/project.server.ts';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projects = await getProjectsByUserId(user.id);
    return json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | undefined;
    const codeContentString = formData.get('codeContent') as string | undefined;
    const previewUrl = formData.get('previewUrl') as string | undefined;

    if (!name || typeof name !== 'string') {
      return json({ error: 'Project name is required and must be a string' }, { status: 400 });
    }

    let codeContent: object | undefined;
    if (codeContentString) {
      try {
        codeContent = JSON.parse(codeContentString);
      } catch (e) {
        return json({ error: 'Invalid JSON format for codeContent' }, { status: 400 });
      }
    }

    const newProject = await createProject(
      user.id,
      name,
      description,
      codeContent,
      previewUrl,
    );

    if (!newProject) {
      return json({ error: 'Failed to create project' }, { status: 500 });
    }

    return json({ project: newProject }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return json({ error: 'An unexpected error occurred while creating the project' }, { status: 500 });
  }
}
