'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerTag {
  id: number;
  name: string;
  color: string;
}

interface CustomerTagsProps {
  customerId: number;
  tags: CustomerTag[];
  onTagsChange?: (tags: CustomerTag[]) => void;
}

export function CustomerTags({ customerId, tags, onTagsChange }: CustomerTagsProps) {
  const [allTags, setAllTags] = useState<CustomerTag[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAllTags();
  }, []);

  const fetchAllTags = async () => {
    try {
      const response = await fetch('/api/crm/tags');
      if (!response.ok) throw new Error('获取标签失败');
      const data = await response.json();
      setAllTags(data);
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/crm/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTagName,
          color: newTagColor,
        }),
      });

      if (!response.ok) throw new Error('创建标签失败');
      
      const newTag = await response.json();
      setAllTags([...allTags, newTag]);
      setNewTagName('');
      setShowAddDialog(false);
    } catch (error) {
      console.error('创建标签失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTag = async (tagId: number) => {
    try {
      const response = await fetch(`/api/crm/customers/${customerId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagId }),
      });

      if (!response.ok) throw new Error('添加标签失败');
      
      const updatedTags = await response.json();
      if (onTagsChange) {
        onTagsChange(updatedTags);
      }
    } catch (error) {
      console.error('添加标签失败:', error);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      const response = await fetch(`/api/crm/customers/${customerId}/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('移除标签失败');
      
      const updatedTags = await response.json();
      if (onTagsChange) {
        onTagsChange(updatedTags);
      }
    } catch (error) {
      console.error('移除标签失败:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className={cn(
              'flex items-center gap-1',
              `bg-[${tag.color}]/10 text-[${tag.color}] border-[${tag.color}]/20`
            )}
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-1 hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            添加标签
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加标签</DialogTitle>
            <DialogDescription>
              为客户添加新的标签
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标签名称</label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="输入标签名称"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">标签颜色</label>
              <div className="flex gap-2">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'w-8 h-8 rounded-full border-2',
                      newTagColor === color ? 'border-primary' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddTag}
              disabled={!newTagName.trim() || isLoading}
            >
              {isLoading ? '添加中...' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap gap-2">
        {allTags
          .filter((tag) => !tags.some((t) => t.id === tag.id))
          .map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className={cn(
                'cursor-pointer hover:opacity-70',
                `bg-[${tag.color}]/10 text-[${tag.color}] border-[${tag.color}]/20`
              )}
              onClick={() => handleAssignTag(tag.id)}
            >
              {tag.name}
            </Badge>
          ))}
      </div>
    </div>
  );
} 