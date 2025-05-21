'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';
import { AdminCreatePartnerForm } from '@/components/admin-create-partner-form';

interface AdminCreatePartnerDialogProps {
  onPartnerCreated?: () => void;
}

export function AdminCreatePartnerDialog({ onPartnerCreated }: AdminCreatePartnerDialogProps) {
  const [open, setOpen] = useState(false);

  const handlePartnerCreated = () => {
    if (onPartnerCreated) {
      onPartnerCreated();
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          添加合作伙伴
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>添加新合作伙伴</DialogTitle>
        </DialogHeader>
        <AdminCreatePartnerForm onPartnerCreated={handlePartnerCreated} />
      </DialogContent>
    </Dialog>
  );
} 