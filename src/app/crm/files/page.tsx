'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { FolderIcon, FileIcon, UploadIcon, SearchIcon, FilePlusIcon, FolderPlusIcon } from 'lucide-react';
import { ClientProvider } from '@/components/client-provider';

// 禁用静态生成和 RSC 预取
export const dynamic = 'force-dynamic';

export default function FilesPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 模拟文件数据
  const files = [
    { id: 1, name: '客户合同模板.docx', type: 'document', size: '25KB', updatedAt: '2023-10-15', createdBy: '管理员' },
    { id: 2, name: '数据分析报告.xlsx', type: 'spreadsheet', size: '1.2MB', updatedAt: '2023-10-16', createdBy: '张三' },
    { id: 3, name: '产品说明书.pdf', type: 'pdf', size: '3.5MB', updatedAt: '2023-10-14', createdBy: '李四' },
    { id: 4, name: '会议记录.txt', type: 'text', size: '12KB', updatedAt: '2023-10-17', createdBy: '王五' },
    { id: 5, name: '宣传图片.png', type: 'image', size: '256KB', updatedAt: '2023-10-18', createdBy: '管理员' },
  ];

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.createdBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ClientProvider requireAuth>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">文件管理</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>文件管理系统</CardTitle>
            <CardDescription>管理和组织您的文件和文档</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex justify-between">
              <div className="flex items-center space-x-2 w-full max-w-sm">
                <Input
                  placeholder="搜索文件..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                <Button variant="outline" size="icon">
                  <SearchIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button>
                  <UploadIcon className="mr-2 h-4 w-4" />
                  上传文件
                </Button>
                <Button variant="outline">
                  <FolderPlusIcon className="mr-2 h-4 w-4" />
                  新建文件夹
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">所有文件</TabsTrigger>
                <TabsTrigger value="documents">文档</TabsTrigger>
                <TabsTrigger value="images">图片</TabsTrigger>
                <TabsTrigger value="other">其他</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>文件名</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>大小</TableHead>
                        <TableHead>更新日期</TableHead>
                        <TableHead>创建者</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell className="flex items-center">
                              {file.type === 'folder' ? (
                                <FolderIcon className="mr-2 h-4 w-4 text-blue-500" />
                              ) : (
                                <FileIcon className="mr-2 h-4 w-4 text-gray-500" />
                              )}
                              {file.name}
                            </TableCell>
                            <TableCell>{file.type}</TableCell>
                            <TableCell>{file.size}</TableCell>
                            <TableCell>{file.updatedAt}</TableCell>
                            <TableCell>{file.createdBy}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">下载</Button>
                                <Button variant="outline" size="sm">分享</Button>
                                <Button variant="outline" size="sm" className="text-red-500">删除</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            {searchQuery ? '没有找到匹配的文件' : '暂无文件'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="documents" className="mt-4">
                <div className="flex h-40 items-center justify-center border rounded-md">
                  <p className="text-muted-foreground">文档模块正在开发中...</p>
                </div>
              </TabsContent>
              <TabsContent value="images" className="mt-4">
                <div className="flex h-40 items-center justify-center border rounded-md">
                  <p className="text-muted-foreground">图片模块正在开发中...</p>
                </div>
              </TabsContent>
              <TabsContent value="other" className="mt-4">
                <div className="flex h-40 items-center justify-center border rounded-md">
                  <p className="text-muted-foreground">其他文件模块正在开发中...</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>可用存储空间：1.5GB/2GB</p>
        </div>
      </div>
    </ClientProvider>
  );
} 