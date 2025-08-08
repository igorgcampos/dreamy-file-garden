import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Shield,
  Loader2,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/auth';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.string(),
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

interface UserProfileProps {
  onClose?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, updateProfile, changePassword, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isUpdating, setIsUpdating] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      preferences: {
        theme: user?.preferences?.theme || 'system',
        language: user?.preferences?.language || 'en',
      },
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setIsUpdating(true);
      await updateProfile(data);
      onClose?.();
    } catch (error) {
      // Error handled by context
    } finally {
      setIsUpdating(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setIsUpdating(true);
      await changePassword(data.currentPassword, data.newPassword);
      passwordForm.reset();
    } catch (error) {
      // Error handled by context
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose?.();
    } catch (error) {
      // Error handled by context
    }
  };

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {user.name}
                {user.role === 'admin' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
                {user.lastLogin && (
                  <span>Last login: {new Date(user.lastLogin).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'profile' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('profile')}
          className="flex-1"
        >
          <UserIcon className="h-4 w-4 mr-2" />
          Profile
        </Button>
        <Button
          variant={activeTab === 'password' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('password')}
          className="flex-1"
        >
          <Settings className="h-4 w-4 mr-2" />
          Security
        </Button>
      </div>

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your personal information and preferences
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...profileForm.register('name')}
                  disabled={isUpdating || isLoading}
                />
                {profileForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme Preference</Label>
                <Select
                  value={profileForm.watch('preferences.theme')}
                  onValueChange={(value: 'light' | 'dark' | 'system') =>
                    profileForm.setValue('preferences.theme', value)
                  }
                  disabled={isUpdating || isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isUpdating || isLoading}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Password Settings */}
      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...passwordForm.register('currentPassword')}
                  disabled={isUpdating || isLoading}
                  autoComplete="current-password"
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-red-500">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...passwordForm.register('newPassword')}
                  disabled={isUpdating || isLoading}
                  autoComplete="new-password"
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-red-500">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...passwordForm.register('confirmPassword')}
                  disabled={isUpdating || isLoading}
                  autoComplete="new-password"
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isUpdating || isLoading}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      )}

      <Separator />

      {/* Logout */}
      <div className="flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full max-w-xs">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of your account?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be logged out of CloudStorage and returned to the sign-in page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout}>
                Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};