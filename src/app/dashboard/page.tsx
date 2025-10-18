'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import LoanOnboardingForm from '@/components/onboarding/LoanOnboardingForm';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  Target,
  Plus,
  Bell,
  Settings,
  Download,
  Bot,
  CreditCard,
  Car,
  Home,
  GraduationCap,
  FileText
} from 'lucide-react';

export default function DashboardPage() {
    const { user, isUserLoading } = useUser();
    const { needsOnboarding, isLoading: onboardingLoading } = useOnboarding();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    if (isUserLoading || onboardingLoading) {
    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <Card>
                <CardHeader>
                        <CardTitle>Loading...</CardTitle>
                        <CardDescription>Please wait while we verify your authentication.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect to login
    }

    // Show onboarding form for first-time users
    if (needsOnboarding) {
        return <LoanOnboardingForm />;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header Section */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">LoanZen</h1>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs sm:text-sm">
                                    Trial: 12 days left
                                </Badge>
                            </div>
                        
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <Button variant="ghost" size="sm" className="hidden sm:flex">
                                <Bell className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="hidden sm:flex">
                                <Settings className="h-5 w-5" />
                            </Button>
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                </div>
                                <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Dashboard Content */}
            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
                    {/* Left Column - Primary Content (70%) */}
                    <div className="xl:col-span-7 space-y-6">
                        {/* Financial Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">Total Debt</CardTitle>
                                    <DollarSign className="h-4 w-4 text-red-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-900 dark:text-red-100">$45,230</div>
                                    <div className="flex items-center text-xs text-red-600 dark:text-red-400">
                                        <TrendingDown className="h-3 w-3 mr-1" />
                                        -2.3% from last month
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Monthly Payments</CardTitle>
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">$2,340</div>
                                    <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        +$120 this month
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">Highest Interest</CardTitle>
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">18.5%</div>
                                    <div className="text-xs text-amber-600 dark:text-amber-400">
                                        Credit Card
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Progress</CardTitle>
                                    <Target className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">23%</div>
                                    <div className="text-xs text-green-600 dark:text-green-400">
                                        Debt freedom
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Loans Overview Section */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Your Loans</CardTitle>
                                        <CardDescription>Manage and track your loan portfolio</CardDescription>
                                    </div>
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Loan
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Sample Loan Cards */}
                                    <Card className="border-l-4 border-l-blue-500">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    <Car className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">Car Loan</CardTitle>
                                                    <CardDescription>Auto Loan</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Balance:</span>
                                                    <span className="font-semibold">$15,230</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Interest Rate:</span>
                                                    <span className="font-semibold">7.5%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Monthly Payment:</span>
                                                    <span className="font-semibold">$320</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span>Progress</span>
                                                        <span>45%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '45%'}}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-l-4 border-l-red-500">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-red-100 rounded-lg">
                                                    <CreditCard className="h-5 w-5 text-red-600" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">Credit Card</CardTitle>
                                                    <CardDescription>High Interest</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Balance:</span>
                                                    <span className="font-semibold">$8,450</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Interest Rate:</span>
                                                    <span className="font-semibold text-red-600">18.5%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Monthly Payment:</span>
                                                    <span className="font-semibold">$180</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span>Progress</span>
                                                        <span>12%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div className="bg-red-500 h-2 rounded-full" style={{width: '12%'}}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Timeline Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Payment Timeline</CardTitle>
                                <CardDescription>Visual overview of your loan payoff schedule</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                            <span className="font-medium">Car Loan</span>
                                        </div>
                                        <div className="text-sm text-gray-600">Paid off in 3.2 years</div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                                            <span className="font-medium">Credit Card</span>
                                        </div>
                                        <div className="text-sm text-gray-600">Paid off in 5.8 years</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Tools & Insights (30%) */}
                    <div className="xl:col-span-3 space-y-6">
                        {/* Quick Actions Panel */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add New Loan
                                </Button>
                                <Button variant="outline" className="w-full">
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Record Payment
                                </Button>
                                <Button variant="outline" className="w-full">
                                    <Download className="h-4 w-4 mr-2" />
                                    Generate Report
                                </Button>
                                <Button variant="outline" className="w-full">
                                    <Bot className="h-4 w-4 mr-2" />
                                    AI Assistant
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Upcoming Payments Widget */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Upcoming Payments</CardTitle>
                                <CardDescription>Next 30 days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        <div>
                                            <div className="font-medium text-sm">Car Loan</div>
                                            <div className="text-xs text-gray-600">Due in 3 days</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold">$320</div>
                                            <div className="text-xs text-red-600">Urgent</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <div>
                                            <div className="font-medium text-sm">Credit Card</div>
                                            <div className="text-xs text-gray-600">Due in 12 days</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold">$180</div>
                                            <div className="text-xs text-amber-600">Soon</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* AI Insights Panel */}
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Insights</CardTitle>
                </CardHeader>
                <CardContent>
                                <div className="space-y-4">
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                        <div className="text-sm font-medium text-green-800 dark:text-green-200">
                                            💡 Smart Suggestion
                                        </div>
                                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            Pay extra $50 on Car Loan to save $120 in interest
                                        </div>
                                    </div>
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                            ⚠️ High Interest Alert
                                        </div>
                                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            Your Credit Card at 18.5% is your most expensive debt
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Trial Upgrade Banner */}
                        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <h3 className="font-semibold mb-2">Unlock Pro Features</h3>
                                    <p className="text-sm opacity-90 mb-3">
                                        Advanced charts, AI insights, and export tools
                                    </p>
                                    <Button variant="secondary" size="sm" className="w-full">
                                        Upgrade Now
                                    </Button>
                                </div>
                </CardContent>
            </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}