import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import { Card } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { FileText, ChevronRight, Calculator } from 'lucide-react';

interface Post {
    id: number;
    current_languages: Array<{
        pivot: {
            name: string;
            content: string;
        }
    }>;
}

interface Props {
    posts: Post[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/backend/dashboard' },
    { title: 'Báo Giá', href: '#' },
];

export default function QuotationIndex({ posts }: Props) {
    const [selectedPostId, setSelectedPostId] = useState<number | null>(
        posts.length > 0 ? posts[0].id : null
    );

    const selectedPost = posts.find(p => p.id === selectedPostId);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Báo Giá" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 page-wrapper overflow-hidden bg-slate-50/50">
                <CustomPageHeading heading="Bảng Báo Giá Chi Tiết" breadcrumbs={breadcrumbs} />
                
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* Left Sidebar / Switcher */}
                    <Card className="w-80 flex flex-col bg-white shadow-xl border-none rounded-2xl overflow-hidden">
                        <div className="p-5 border-b bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                            <h3 className="font-bold flex items-center gap-2">
                                <Calculator className="h-5 w-5" />
                                Danh mục báo giá
                            </h3>
                            <p className="text-xs text-blue-100 mt-1">Chọn một mục để xem chi tiết</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {posts.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-sm italic">
                                    Chưa có bài báo giá nào
                                </div>
                            ) : (
                                posts.map((post) => {
                                    const isActive = selectedPostId === post.id;
                                    return (
                                        <button
                                            key={post.id}
                                            onClick={() => setSelectedPostId(post.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 text-left group",
                                                isActive 
                                                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 shadow-sm" 
                                                    : "hover:bg-slate-50 text-slate-600 border-l-4 border-transparent"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-blue-500"
                                                )}>
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-bold truncate max-w-[160px]",
                                                    isActive ? "text-blue-700" : "text-slate-700"
                                                )}>
                                                    {post.current_languages[0]?.pivot.name}
                                                </span>
                                            </div>
                                            <ChevronRight className={cn(
                                                "h-4 w-4 transition-transform duration-300",
                                                isActive ? "text-blue-600 translate-x-1" : "text-slate-300 group-hover:text-slate-400"
                                            )} />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </Card>

                    {/* Content Area */}
                    <Card className="flex-1 bg-white shadow-2xl border-none rounded-3xl overflow-hidden flex flex-col">
                        {selectedPost ? (
                            <>
                                <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                        <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                                        {selectedPost.current_languages[0]?.pivot.name}
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <div 
                                        className="prose prose-slate max-w-none quotation-content"
                                        dangerouslySetInnerHTML={{ __html: selectedPost.current_languages[0]?.pivot.content }}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                                <div className="p-6 bg-slate-50 rounded-full">
                                    <FileText className="h-12 w-12 text-slate-200" />
                                </div>
                                <p className="font-medium italic">Vui lòng chọn một danh mục báo giá bên trái</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .quotation-content {
                    color: #334155;
                    line-height: 1.6;
                }
                .quotation-container {
                    padding: 4px;
                }
                .modern-quotation-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    background: white;
                    font-size: 14px;
                }
                .modern-quotation-table thead th {
                    background: #f8fafc;
                    color: #475569;
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 12px;
                    letter-spacing: 0.05em;
                    padding: 16px;
                    border-bottom: 2px solid #e2e8f0;
                }
                .modern-quotation-table tbody td {
                    padding: 14px 16px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }
                .modern-quotation-table tbody tr:last-child td {
                    border-bottom: none;
                }
                .modern-quotation-table tbody tr:hover {
                    background: #fdfdfd;
                }
                
                /* Brand/Category Row */
                .modern-quotation-table .brand-row td {
                    background: #f1f5f9;
                    color: #0f172a;
                    font-weight: 800;
                    font-size: 13px;
                    text-align: center;
                    letter-spacing: 0.1em;
                    padding: 10px 16px;
                }
                
                .modern-quotation-table .name {
                    font-weight: 600;
                    color: #1e293b;
                    width: 30%;
                }
                .modern-quotation-table .price {
                    text-align: center;
                    font-family: 'Inter', system-ui, sans-serif;
                    color: #3b82f6;
                    font-weight: 600;
                }
                .modern-quotation-table .deposit {
                    text-align: right;
                    color: #ef4444;
                    font-weight: 700;
                }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }

                /* Striped effect */
                .modern-quotation-table tbody tr:not(.brand-row):nth-child(even) {
                    background: #fcfdfe;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }

                /* Fallback for generic tables pasted by user */
                .quotation-content table:not(.modern-quotation-table) {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1rem 0;
                    border: 1px solid #e2e8f0;
                }
                .quotation-content table:not(.modern-quotation-table) th {
                    background: #f8fafc;
                    padding: 12px;
                    border: 1px solid #e2e8f0;
                    text-align: left;
                }
                .quotation-content table:not(.modern-quotation-table) td {
                    padding: 12px;
                    border: 1px solid #e2e8f0;
                }
            `}} />
        </AppLayout>
    );
}
