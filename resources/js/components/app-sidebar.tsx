import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, User2, Settings, Notebook, Package, Container, Tag, Ticket, ArrowLeftRight, Book, Menu, ShoppingCart, Calendar, TrendingUp, Calculator } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Thành Viên',
        href: '#',
        icon: User2,
        items: [
            {
                title: 'Nhóm Thành Viên',
                url: '/backend/user_catalogue',
                permission: 'user_catalogue:index'
            },
            {
                title: 'Thành Viên',
                url: '/backend/user',
                permission: 'user:index'
            },
            {
                title: 'Quyền',
                url: '/backend/permission',
                permission: 'permission:index'
            }
        ]

    },
    {
        title: 'Sản Phẩm',
        href: '#',
        icon: Package,
        items: [
            {
                title: 'Nhóm Sản Phẩm',
                url: '/backend/product_catalogue',
                permission: 'product_catalogue:index'
            },
            {
                title: 'Sản Phẩm',
                url: '/backend/product',
                permission: 'product:index'
            },
            {
                title: 'Thương Hiệu',
                url: '/backend/product_brand',
                permission: 'product_brand:index'
            },

        ]
    },
    {
        title: 'Đặt Lịch',
        href: '#',
        icon: Calendar,
        items: [
            {
                title: 'Lịch Máy',
                url: '/backend/booking/calendar',
            },
            {
                title: 'Danh Sách Đơn',
                url: '/backend/booking/index',
            },
            {
                title: 'Thống Kê Doanh Thu',
                url: '/backend/booking/statistics',
            }
        ]
    },
    {
        title: 'Báo Giá',
        href: '/backend/quotation',
        icon: Calculator,
    },
    {
        title: 'Bài Viết',
        href: '#',
        icon: Notebook,
        items: [
            {
                title: 'Nhóm Bài Viết',
                url: '/backend/post_catalogue',
                permission: 'post_catalogue:index'
            },
            {
                title: 'Bài Viết',
                url: '/backend/post',
                permission: 'post:index'
            }
        ]
    },
    {
        title: 'Khách Hàng',
        href: '#',
        icon: User2,
        items: [
            {
                title: 'Nhóm Khách Hàng',
                url: '/backend/customer_catalogue',
                permission: 'customer_catalogue:index'
            },
            {
                title: 'Khách Hàng',
                url: '/backend/customer',
                permission: 'customer:index'
            }
        ]
    },
    {
        title: 'Sổ Quỹ',
        href: '/backend/cash-book/transaction',
        icon: Book,
        permission: 'cash_book:index'
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

import { usePage } from '@inertiajs/react';

export function AppSidebar() {
    const { auth } = usePage().props as any;
    const user = auth.user;

    const filteredNavItems = mainNavItems.filter((item) => {
        // Dashboard chỉ dành cho Super Admin
        if (item.title === 'Dashboard') return user?.is_super_admin;

        // Nếu là Super Admin thì cho xem tất cả các menu còn lại
        if (user?.is_super_admin) return true;

        // Kiểm tra quyền của mục chính
        if (item.permission && !user?.permissions?.includes(item.permission)) {
            return false;
        }

        // Kiểm tra quyền của các mục con (nếu có)
        if (item.items) {
            const visibleSubItems = item.items.filter((subItem) => {
                if (subItem.permission && !user?.permissions?.includes(subItem.permission)) {
                    return false;
                }
                return true;
            });

            // Nếu có mục con hợp lệ thì cập nhật lại danh sách mục con và hiển thị mục chính
            if (visibleSubItems.length > 0) {
                item.items = visibleSubItems;
                return true;
            }
            return false;
        }

        return true;
    });

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={filteredNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
