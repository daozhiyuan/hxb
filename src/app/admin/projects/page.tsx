'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { isAdmin } from '@/lib/auth-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const dynamic = 'force-dynamic';

type Task = {
  id: number;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  priority: string;
};

type Project = {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  priority: string;
  tasks: Task[];
};

export default function AdminProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [taskTitle, setTaskTitle] = useState<Record<number, string>>({});

  const load = async () => {
    const res = await fetch('/api/admin/projects', { cache: 'no-store' });
    const json = await res.json();
    setProjects(json.data || []);
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated' && !isAdmin(session)) router.replace('/unauthorized');
    if (status === 'authenticated' && isAdmin(session)) load();
  }, [status, session, router]);

  const createProject = async () => {
    if (!name.trim()) return;
    await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, priority: 'MEDIUM' }),
    });
    setName('');
    setDescription('');
    await load();
  };

  const createTask = async (projectId: number) => {
    const title = taskTitle[projectId]?.trim();
    if (!title) return;
    await fetch(`/api/admin/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority: 'MEDIUM' }),
    });
    setTaskTitle((prev) => ({ ...prev, [projectId]: '' }));
    await load();
  };

  const updateTaskStatus = async (taskId: number, status: Task['status']) => {
    await fetch(`/api/admin/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  if (status === 'loading') return <div className="p-6">加载中...</div>;

  return (
    <div className="container mx-auto py-8 space-y-4">
      <h1 className="text-2xl font-bold">项目管理（最小可用版）</h1>
      <Card>
        <CardHeader><CardTitle>新建项目</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="项目名称" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="项目说明" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={createProject}>创建项目</Button>
        </CardContent>
      </Card>

      {projects.map((project) => (
        <Card key={project.id}>
          <CardHeader>
            <CardTitle>{project.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">{project.description || '暂无描述'}</p>
            <div className="flex gap-2">
              <Input
                placeholder="新任务标题"
                value={taskTitle[project.id] || ''}
                onChange={(e) => setTaskTitle((prev) => ({ ...prev, [project.id]: e.target.value }))}
              />
              <Button onClick={() => createTask(project.id)}>加任务</Button>
            </div>
            <div className="space-y-2">
              {project.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="text-xs text-gray-500">优先级：{task.priority}</div>
                  </div>
                  <select
                    className="rounded border px-2 py-1"
                    value={task.status}
                    onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                  >
                    <option value="TODO">待办</option>
                    <option value="IN_PROGRESS">进行中</option>
                    <option value="BLOCKED">阻塞</option>
                    <option value="DONE">完成</option>
                  </select>
                </div>
              ))}
              {project.tasks.length === 0 && <p className="text-sm text-gray-500">暂无任务</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
