'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/firebase';
import { Mail, CreditCard, Shield, HelpCircle } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useUser();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account settings and preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Notifications</h3>
            </div>
            <div className="flex items-center justify-between pl-6">
              <Label htmlFor="email-notifications" className="text-sm">Email Notifications</Label>
              <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <div className="flex items-center justify-between pl-6">
              <Label htmlFor="push-notifications" className="text-sm">Push Notifications</Label>
              <Switch id="push-notifications" checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>
          </div>

          <Separator />

          {/* Account */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Account</h3>
            </div>
            <div className="space-y-2 pl-6">
              <div className="text-sm">
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email || 'N/A'}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Display Name</p>
                <p className="font-medium">{user?.displayName || 'Not set'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Subscription */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Subscription</h3>
            </div>
            <div className="pl-6">
              <Button variant="outline" size="sm" className="w-full">
                Manage Subscription
              </Button>
            </div>
          </div>

          <Separator />

          {/* Help */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Support</h3>
            </div>
            <div className="pl-6 space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Help Center
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

