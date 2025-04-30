'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // To display status
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns'; // For date formatting
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerStatus } from "@prisma/client";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

// Define the expected shape of customer data from the API
interface Customer {
  id: number;
  name: string;
  companyName: string | null;
  lastYearRevenue: number | null;
  phone: string | null;
  address: string | null;
  status: string; // Use the string type
  notes: string | null;
  registrationDate: string; // ISO string initially
  updatedAt: string; // ISO string initially
  jobTitle: string | null; // Added jobTitle
}

type SortField = 'name' | 'companyName' | 'registrationDate' | 'status' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

interface PaginatedResponse {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<CustomerStatus | "">("");
  const [sortField, setSortField] = useState<SortField>('registrationDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const pageSize = 10;
  const { toast } = useToast();

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    async function fetchCustomers() {
      setIsLoading(true);
      setError(null);
      try {
        console.log("开始获取客户列表...");
        const searchParams = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
          sortBy: sortField,
          sortOrder: sortOrder,
        });

        if (debouncedSearchTerm) {
          searchParams.append('search', debouncedSearchTerm);
        }

        if (selectedStatus) {
          searchParams.append('status', selectedStatus);
        }

        const response = await fetch(`/api/crm/customers?${searchParams.toString()}`);
        console.log("API响应状态:", response.status);
        if (!response.ok) {
          const errorData = await response.json();
          console.error("API错误:", errorData);
          throw new Error(errorData.message || '获取客户列表失败');
        }
        const data: PaginatedResponse = await response.json();
        console.log("获取到的客户数据:", data);
        setCustomers(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      } catch (err: any) {
        console.error("获取客户列表失败:", err);
        setError(err.message || '无法加载客户数据');
        toast({
          title: "加载错误",
          description: err.message || '无法加载客户数据，请稍后重试。',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCustomers();
  }, [currentPage, debouncedSearchTerm, selectedStatus, sortField, sortOrder, toast]);

  const renderSkeleton = () => (
    [...Array(3)].map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
      </TableRow>
    ))
  );

  const getStatusText = (status: string) => {
    switch (status) {
      case 'FOLLOWING': return '跟进中';
      case 'NEGOTIATING': return '洽谈中';
      case 'PENDING': return '待处理';
      case 'SIGNED': return '已签约';
      case 'COMPLETED': return '已完成';
      case 'LOST': return '已流失';
      default: return status;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value as CustomerStatus | "");
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("");
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return (
      <ArrowUpDown
        className={cn(
          "ml-2 h-4 w-4",
          sortOrder === 'asc' ? "rotate-0" : "rotate-180"
        )}
      />
    );
  };

  return (
    <div className="mt-6">
      <div className="flex flex-col space-y-4">
        <h3 className="text-lg font-medium">已报备客户列表</h3>
        
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索客户姓名、单位或电话..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-8"
            />
          </div>
          
          <Select
            value={selectedStatus}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部状态</SelectItem>
              <SelectItem value="FOLLOWING">跟进中</SelectItem>
              <SelectItem value="NEGOTIATING">洽谈中</SelectItem>
              <SelectItem value="PENDING">待处理</SelectItem>
              <SelectItem value="SIGNED">已签约</SelectItem>
              <SelectItem value="COMPLETED">已完成</SelectItem>
              <SelectItem value="LOST">已流失</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || selectedStatus) && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
            >
              清除筛选
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 mt-4">加载失败: {error}</p>}
      
      <div className="rounded-md border mt-4">
        <Table>
          <TableCaption>
            共 {totalItems} 条客户信息
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                姓名 {getSortIcon('name')}
              </TableHead>
              <TableHead onClick={() => handleSort('companyName')} className="cursor-pointer">
                单位名称 {getSortIcon('companyName')}
              </TableHead>
              <TableHead>去年营收</TableHead>
              <TableHead>职务</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>地址</TableHead>
              <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                状态 {getSortIcon('status')}
              </TableHead>
              <TableHead onClick={() => handleSort('registrationDate')} className="cursor-pointer">
                报备日期 {getSortIcon('registrationDate')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              renderSkeleton()
            ) : customers.length > 0 ? (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.companyName || '-'}</TableCell>
                  <TableCell>{customer.lastYearRevenue || '-'}</TableCell>
                  <TableCell>{customer.jobTitle || '-'}</TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell>{customer.address || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={
                      customer.status === 'FOLLOWING' ? 'default' : 
                      customer.status === 'NEGOTIATING' ? 'secondary' :
                      customer.status === 'SIGNED' ? 'default' :
                      customer.status === 'COMPLETED' ? 'default' :
                      customer.status === 'LOST' ? 'destructive' :
                      'secondary'
                    }>
                      {getStatusText(customer.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(customer.registrationDate), 'yyyy-MM-dd HH:mm')}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center">暂无客户数据</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                />
              </PaginationItem>
              
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNumber)}
                        isActive={currentPage === pageNumber}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (
                  pageNumber === currentPage - 2 ||
                  pageNumber === currentPage + 2
                ) {
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
