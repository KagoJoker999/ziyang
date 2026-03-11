import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileSpreadsheet, Calculator, Trash2, Image as ImageIcon, AlertCircle, PackageOpen, Tag, Layers, UploadCloud, History, X, MapPin, Copy } from 'lucide-react';
import { supabase } from './lib/supabase';

// --- 中文键名到内部类型的映射 ---
const TYPE_MAP = {
    '福利品区': 'welfare',
    '孤品区': 'orphan',
    '滞销品区': 'unsaleable'
};

const LABEL_MAP = {
    'welfare': '福利品',
    'orphan': '孤品',
    'unsaleable': '滞销品'
};

// --- 解析中文配置格式（纯函数，移到组件外部）---

// 解析区间字符串: "1-5:1/46-50:1/96-100:1" => [{start, end, step}, ...]
const parseRangeString = (rangeStr) => {
    if (!rangeStr || typeof rangeStr !== 'string') return [];
    const segments = rangeStr.split('/');
    return segments.map(seg => {
        const [range, stepStr] = seg.split(':');
        const [start, end] = range.split('-').map(Number);
        const step = stepStr ? parseInt(stepStr) : 1;
        return { start, end, step };
    }).filter(r => !isNaN(r.start) && !isNaN(r.end));
};

// 解析提取配置字符串: "重复/5" 或 "不重复"
const parseExtractString = (extractStr) => {
    if (!extractStr || typeof extractStr !== 'string') return { isRepeatable: false };
    if (extractStr.startsWith('重复')) {
        const parts = extractStr.split('/');
        const count = parts[1] ? parseInt(parts[1]) : 5;
        return { isRepeatable: true, extractCount: count };
    }
    return { isRepeatable: false };
};

// --- 组件：卡片容器 ---
const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
        {children}
    </div>
);

// --- 组件：上传与展示区域 ---
const DropZone = ({ title, type, onFileLoaded, data, onClear, colorClass, icon: Icon, totalIds, extractNeed, isRepeatable }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
    };

    const processFile = (file) => {
        if (!window.XLSX) {
            alert("Excel解析库尚未加载完成，请稍候...");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = window.XLSX.utils.sheet_to_json(worksheet);
            onFileLoaded(type, jsonData, file.name);
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Card className="flex flex-col h-full relative group">
            <div className={`p-4 border-b ${colorClass} bg-opacity-10 flex items-center justify-between`}>
                <div className="flex items-center gap-2 font-bold text-slate-700">
                    <Icon size={20} />
                    {title}
                </div>
                {data && (
                    <button onClick={() => onClear(type)} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-white" title="清除数据">
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            {/* 配置信息展示区 */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                        <div className="text-xs text-blue-500 uppercase font-bold mb-1">将生成 ID 总数</div>
                        <div className="text-2xl font-bold text-blue-800">{totalIds}</div>
                        <div className="text-[10px] text-blue-400">根据区间计算</div>
                    </div>
                    <div className={`p-3 rounded-lg border text-center ${isRepeatable ? 'bg-purple-50 border-purple-100' : 'bg-slate-100 border-slate-200'}`}>
                        <div className={`text-xs uppercase font-bold mb-1 ${isRepeatable ? 'text-purple-500' : 'text-slate-500'}`}>需从 EXCEL 提取</div>
                        <div className={`text-2xl font-bold ${isRepeatable ? 'text-purple-800' : 'text-slate-700'}`}>{extractNeed}</div>
                        <div className={`text-[10px] ${isRepeatable ? 'text-purple-400' : 'text-slate-400'}`}>
                            {isRepeatable ? `循环填充 (Top${extractNeed})` : "与 ID 总数一致"}
                        </div>
                    </div>
                </div>
            </div>

            {/* 拖拽区域 */}
            <div className="flex-1 p-4 flex flex-col justify-center min-h-[120px]">
                {!data ? (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`h-full min-h-[100px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
                    >
                        <input type="file" accept=".xlsx, .xls" className="hidden" id={`file-${type}`} onChange={handleFileSelect} />
                        <label htmlFor={`file-${type}`} className="cursor-pointer flex flex-col items-center w-full h-full justify-center p-4">
                            <Upload className="text-slate-400 mb-2" size={24} />
                            <span className="text-xs text-slate-500">点击或拖拽 Excel 文件</span>
                        </label>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center w-full">
                        <FileSpreadsheet className="mx-auto text-green-600 mb-2" size={32} />
                        <div className="text-sm font-medium text-green-800 truncate px-2 mb-1">{data.fileName}</div>
                        <div className="text-xs text-green-600">池内商品数: {data.rows.length} 个</div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default function App() {
    const [libLoaded, setLibLoaded] = useState(false);
    const [configLoaded, setConfigLoaded] = useState(false);
    const [configError, setConfigError] = useState(null);

    // 配置状态（已解析为内部格式）
    const [extractConfig, setExtractConfig] = useState({});
    const [rangeConfig, setRangeConfig] = useState({});

    // 原始数据状态
    const [rawData, setRawData] = useState({
        welfare: null,
        orphan: null,
        unsaleable: null
    });

    const [results, setResults] = useState([]);
    const [stats, setStats] = useState(null);
    
    const [isUploading, setIsUploading] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isCopyingCodes, setIsCopyingCodes] = useState(false);
    const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);

    // --- 加载 XLSX 库 ---
    useEffect(() => {
        if (window.XLSX) {
            setLibLoaded(true);
        } else {
            const script = document.createElement('script');
            script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
            script.async = true;
            script.onload = () => setLibLoaded(true);
            document.body.appendChild(script);
        }
    }, []);

    // --- 加载配置文件 ---
    const loadConfigs = useCallback(async () => {
        try {
            // 添加时间戳防止缓存
            const timestamp = new Date().getTime();
            const [extractRes, rangeRes] = await Promise.all([
                fetch(`./extract_config.json?t=${timestamp}`),
                fetch(`./range_config.json?t=${timestamp}`)
            ]);

            if (!extractRes.ok || !rangeRes.ok) {
                throw new Error('配置文件加载失败');
            }

            const extractRaw = await extractRes.json();
            const rangeRaw = await rangeRes.json();

            // 转换中文键名为内部格式
            const parsedExtract = {};
            const parsedRange = {};

            Object.entries(extractRaw).forEach(([cnKey, value]) => {
                const internalKey = TYPE_MAP[cnKey];
                if (internalKey) {
                    parsedExtract[internalKey] = parseExtractString(value);
                }
            });

            Object.entries(rangeRaw).forEach(([cnKey, value]) => {
                const internalKey = TYPE_MAP[cnKey];
                if (internalKey) {
                    parsedRange[internalKey] = parseRangeString(value);
                }
            });

            setExtractConfig(parsedExtract);
            setRangeConfig(parsedRange);
            setConfigLoaded(true);
            setConfigError(null);
        } catch (error) {
            setConfigError(error.message);
            console.error('配置加载失败:', error);
        }
    }, []);

    useEffect(() => {
        loadConfigs();
    }, [loadConfigs]);

    // --- 辅助计算函数 ---

    // 计算总 ID 数量
    const getTotalIdCount = (type) => {
        const ranges = rangeConfig[type] || [];
        return ranges.reduce((sum, r) => {
            if (r.end < r.start || r.step <= 0) return sum;
            return sum + Math.floor((r.end - r.start) / r.step) + 1;
        }, 0);
    };

    // 计算需要从 Excel 提取的源商品数量
    const getExtractNeed = (type) => {
        const conf = extractConfig[type] || {};
        const totalIds = getTotalIdCount(type);
        if (conf.isRepeatable) {
            return conf.extractCount || 5;
        } else {
            return totalIds;
        }
    };

    // 生成所有目标 ID
    const generateTargetIds = (type) => {
        const ranges = rangeConfig[type] || [];
        let ids = [];
        ranges.forEach(r => {
            if (r.step <= 0) return;
            for (let i = r.start; i <= r.end; i += r.step) {
                ids.push(i);
            }
        });
        return [...new Set(ids)].sort((a, b) => a - b);
    };

    const handleFileLoaded = (type, rows, fileName) => {
        setRawData(prev => ({ ...prev, [type]: { rows, fileName } }));
    };

    const handleClear = (type) => {
        setRawData(prev => ({ ...prev, [type]: null }));
        setResults([]);
        setStats(null);
    };

    const getField = (row, ...keys) => {
        for (let k of keys) {
            if (row[k] !== undefined) return row[k];
        }
        return "";
    };

    const getNumberField = (row, ...keys) => {
        return Number(getField(row, ...keys)) || 0;
    };

    // --- 核心计算逻辑 ---
    const calculate = () => {
        let allResults = [];
        let statistics = { total: 0, details: {} };

        const processCategory = (type, label, color) => {
            const conf = extractConfig[type] || {};
            const targetIds = generateTargetIds(type);
            const totalIds = targetIds.length;
            const extractNeed = getExtractNeed(type);

            statistics.details[type] = {
                idCount: totalIds,
                extractNeed: extractNeed,
                actual: 0,
                status: 'ok'
            };

            if (!rawData[type] || totalIds <= 0) return;

            let rows = [...rawData[type].rows];

            // 按库存/可用数 降序排序
            rows.sort((a, b) => {
                const stockA = getNumberField(a, '可用数', '数量', '库存', 'Stock', 'Qty');
                const stockB = getNumberField(b, '可用数', '数量', '库存', 'Stock', 'Qty');
                return stockB - stockA;
            });

            // 筛选源商品池
            let sourcePool = rows.slice(0, extractNeed);

            if (!conf.isRepeatable && sourcePool.length < extractNeed) {
                statistics.details[type].status = 'warning';
            }
            if (conf.isRepeatable && sourcePool.length === 0) {
                return;
            }

            // 分配 ID
            targetIds.forEach((currentId, index) => {
                let sourceItem;

                if (conf.isRepeatable) {
                    sourceItem = sourcePool[index % sourcePool.length];
                } else {
                    if (index >= sourcePool.length) return;
                    sourceItem = sourcePool[index];
                }

                if (sourceItem) {
                    let name = getField(sourceItem, '商品名称', 'Name', 'Title', 'name', 'title');
                    // 提取「」之间的内容
                    const match = name.match(/「([^」]*)」/);
                    if (match) {
                        name = `「${match[1]}」`;
                    }
                    const code = getField(sourceItem, '商品编码', 'Code', 'SKU', 'code', 'sku');
                    const location = getField(sourceItem, '主仓位', 'Location', '仓位', 'location');
                    const image = getField(sourceItem, '图片', '图片链接', 'Image', 'Pic', 'image', 'url');
                    const stock = getNumberField(sourceItem, '可用数', '数量', '库存', 'Stock', 'Qty');

                    allResults.push({
                        id: currentId,
                        category: label,
                        categoryType: type,
                        name, code, location, image, color, stock
                    });
                }
            });

            statistics.details[type].actual = allResults.filter(r => r.categoryType === type).length;
        };

        processCategory('welfare', '福利品', 'bg-blue-100 text-blue-800');
        processCategory('orphan', '孤品', 'bg-purple-100 text-purple-800');
        processCategory('unsaleable', '滞销品', 'bg-orange-100 text-orange-800');

        statistics.total = allResults.length;
        allResults.sort((a, b) => a.id - b.id);

        setResults(allResults);
        setStats(statistics);
    };

    // --- Supabase 上传逻辑 ---
    const handleUpload = async () => {
        if (!results || results.length === 0) {
            alert("没有可上传的排品结果！请先执行分配。");
            return;
        }

        setIsUploading(true);
        try {
            // 1. 清空旧数据 (因为 Supabase 不允许没有过滤条件的全局 Delete，我们匹配不为空的 ID 即可全局删除，或者提供一个永远为 true 的条件)
            // 注意：如果您的 Supabase RLS (Row Level Security) 被激活了，匿名删除可能会被拒绝。请确保关闭 RLS 或允许 anon 角色删改该表。
            const { error: deleteError } = await supabase
                .from('zhiyang_allocations')
                .delete()
                .neq('product_id', -1); // 删除 product_id 不等于 -1 的所有行 (即清空所有)

            if (deleteError) {
                console.error("删除旧数据失败:", deleteError);
                throw new Error("清空历史记录失败，请检查数据库权限设置");
            }

            // 2. 构造要插入的数据
            const recordsToInsert = results.map(item => ({
                product_id: item.id,
                category: item.category,
                category_type: item.categoryType,
                product_name: item.name,
                product_code: item.code,
                location: item.location,
                image_url: item.image,
                stock: item.stock
            }));

            // 3. 批量插入新数据
            const { error: insertError } = await supabase
                .from('zhiyang_allocations')
                .insert(recordsToInsert);

            if (insertError) {
                console.error("插入新数据失败:", insertError);
                throw new Error("插入数据失败");
            }

            alert("上传成功！");
        } catch (error) {
            alert(error.message || "上传过程中发生错误");
        } finally {
            setIsUploading(false);
        }
    };

    // --- Supabase 查看历史逻辑 ---
    const fetchHistory = async () => {
        setIsHistoryModalOpen(true);
        setIsLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('zhiyang_allocations')
                .select('*')
                .order('product_id', { ascending: true });

            if (error) {
                console.error("加载历史记录失败:", error);
                throw new Error("无法加载历史记录");
            }

            setHistoryData(data || []);
        } catch (error) {
            alert(error.message || "加载历史记录发生错误");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // --- Supabase 批量复制商品编码逻辑 ---
    const handleCopyProductCodes = async () => {
        setIsCopyingCodes(true);
        try {
            const { data, error } = await supabase
                .from('zhiyang_allocations')
                .select('product_code');

            if (error) {
                console.error("查询商品编码失败:", error);
                throw new Error("无法查询商品编码");
            }

            if (!data || data.length === 0) {
                alert("历史记录中没有任何商品编码");
                return;
            }

            const codes = data
                .map(item => item.product_code)
                .filter(code => code !== null && code !== undefined && String(code).trim() !== "");

            if (codes.length === 0) {
                alert("没有找到有效的商品编码");
                return;
            }

            const codeString = codes.join(',');
            await navigator.clipboard.writeText(codeString);
            alert(`成功复制 ${codes.length} 个商品编码到剪贴板！`);
        } catch (error) {
            alert(error.message || "复制过程中发生错误");
        } finally {
            setIsCopyingCodes(false);
        }
    };

    // --- Supabase 仓位批量更新逻辑 ---
    const handleLocationUpdate = (e) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (!file) return;

        if (!window.XLSX) {
            alert("Excel解析库尚未加载完成，请稍候...");
            e.target.value = '';
            return;
        }

        setIsUpdatingLocation(true);
        const reader = new FileReader();

        reader.onload = async (eEvent) => {
            try {
                const data = new Uint8Array(eEvent.target.result);
                const workbook = window.XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                const getFieldLocal = (row, ...keys) => {
                    for (let k of keys) {
                        if (row[k] !== undefined && row[k] !== "") return String(row[k]).trim();
                    }
                    return "";
                };

                const updates = [];
                for (let row of jsonData) {
                    let name = getFieldLocal(row, '商品名称', 'Name', 'Title', 'name', 'title');
                    let location = getFieldLocal(row, '主仓位', 'Location', '仓位', 'location');
                    if (name && location) {
                        // 确保和系统中提取的格式保持一致
                        const match = name.match(/「([^」]*)」/);
                        if (match) {
                            name = `「${match[1]}」`;
                        }
                        updates.push({ name, location });
                    }
                }

                if (updates.length === 0) {
                    throw new Error("表格中未找到有效的「商品名称」和「仓位」列");
                }

                let successCount = 0;
                let failCount = 0;
                // 为了避免瞬时过大的并发引起问题，此处使用串行请求进行逐条更新
                for (const update of updates) {
                    const { error } = await supabase
                        .from('zhiyang_allocations')
                        .update({ location: update.location })
                        .eq('product_name', update.name);
                    
                    if (!error) {
                        successCount++;
                    } else {
                        console.error('更新失败', update.name, error);
                        failCount++;
                    }
                }

                let msg = `仓位更新完成！\n成功发送更新请求：${successCount} 条`;
                if (failCount > 0) msg += `\n失败：${failCount} 条`;
                alert(msg);

                if (successCount > 0) {
                    setIsLocationModalOpen(false);
                }

            } catch (err) {
                alert(`仓位更新错误: ${err.message}`);
            } finally {
                setIsUpdatingLocation(false);
                if (e.target && e.target.value !== undefined) {
                    e.target.value = ''; // 重置 file input
                }
            }
        };

        reader.onerror = () => {
            alert("文件读取失败");
            setIsUpdatingLocation(false);
            if (e.target && e.target.value !== undefined) {
                e.target.value = '';
            }
        };

        reader.readAsArrayBuffer(file);
    };

    // 配置加载中或错误状态
    if (!configLoaded) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="text-center">
                    {configError ? (
                        <div className="text-red-600">
                            <AlertCircle size={48} className="mx-auto mb-4" />
                            <p className="text-lg font-bold">配置加载失败</p>
                            <p className="text-sm">{configError}</p>
                        </div>
                    ) : (
                        <div className="text-slate-500">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p>加载配置中...</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <PackageOpen className="text-blue-600" />
                            商品智能分拣系统 <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">v4.2</span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                            {libLoaded ? <span className="text-green-600 font-medium">● 系统就绪</span> : '⏳ 加载组件...'}
                            <span className="text-slate-300">|</span>
                            <span className="text-green-600">配置已加载</span>
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsLocationModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm font-medium flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <MapPin size={18} /> 仓位更新
                        </button>
                        
                        <button 
                            onClick={fetchHistory}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg shadow-sm font-medium flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <History size={18} /> 历史排品
                        </button>
                        
                        <button 
                            onClick={handleUpload}
                            disabled={isUploading || results.length === 0}
                            className={`px-4 py-2 rounded-lg shadow-sm font-medium flex items-center gap-2 transition-transform ${isUploading || results.length === 0 ? 'bg-indigo-300 cursor-not-allowed text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'}`}
                        >
                            <UploadCloud size={18} /> {isUploading ? '上传中...' : '保存排品结果'}
                        </button>

                        <button onClick={calculate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md font-medium flex items-center gap-2 transition-transform active:scale-95 ml-2">
                            <Calculator size={18} /> 执行分配
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <DropZone
                        title="福利品区"
                        type="welfare"
                        icon={Tag}
                        colorClass="bg-blue-500 border-blue-200"
                        data={rawData.welfare}
                        onFileLoaded={handleFileLoaded}
                        onClear={handleClear}
                        totalIds={getTotalIdCount('welfare')}
                        extractNeed={getExtractNeed('welfare')}
                        isRepeatable={extractConfig.welfare?.isRepeatable}
                    />
                    <DropZone
                        title="孤品区"
                        type="orphan"
                        icon={Layers}
                        colorClass="bg-purple-500 border-purple-200"
                        data={rawData.orphan}
                        onFileLoaded={handleFileLoaded}
                        onClear={handleClear}
                        totalIds={getTotalIdCount('orphan')}
                        extractNeed={getExtractNeed('orphan')}
                        isRepeatable={extractConfig.orphan?.isRepeatable}
                    />
                    <DropZone
                        title="滞销品区"
                        type="unsaleable"
                        icon={AlertCircle}
                        colorClass="bg-orange-500 border-orange-200"
                        data={rawData.unsaleable}
                        onFileLoaded={handleFileLoaded}
                        onClear={handleClear}
                        totalIds={getTotalIdCount('unsaleable')}
                        extractNeed={getExtractNeed('unsaleable')}
                        isRepeatable={extractConfig.unsaleable?.isRepeatable}
                    />
                </div>

                {/* 统计与结果区 */}
                {stats && (
                    <Card className="p-5 bg-white">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                            分配结果统计
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-800 text-white rounded-lg shadow-sm">
                                <div className="text-xs opacity-70 uppercase mb-1">总生成条目</div>
                                <div className="text-3xl font-bold">{stats.total}</div>
                            </div>

                            {[
                                { key: 'welfare', label: '福利品', color: 'blue' },
                                { key: 'orphan', label: '孤品', color: 'purple' },
                                { key: 'unsaleable', label: '滞销品', color: 'orange' }
                            ].map(({ key, label, color }) => {
                                const info = stats.details[key];
                                const isSuccess = info.status !== 'warning';
                                return (
                                    <div key={key} className={`p-3 rounded border relative ${isSuccess ? `bg-${color}-50 border-${color}-100` : 'bg-red-50 border-red-200'}`}>
                                        <div className={`text-xs font-bold uppercase text-${color}-600 mb-2 flex justify-between items-center`}>
                                            {label}
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {isSuccess ? '✓ 提取成功' : '✗ 提取失败'}
                                            </span>
                                        </div>
                                        <div className={`text-xl font-bold text-${color}-900`}>
                                            实际分配: {info.actual}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {results.length > 0 && (
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                        <th className="p-3 w-16 text-center">序号</th>
                                        <th className="p-3 w-16 text-center">分类</th>
                                        <th className="p-3 w-24 text-center">预览</th>
                                        <th className="p-3 w-48">商品名称</th>
                                        <th className="p-3 w-16 text-center">可用数</th>
                                        <th className="p-3 w-28">商品编码</th>
                                        <th className="p-3 w-20">仓位</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {results.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-2 font-mono font-bold text-center text-slate-700">
                                                #{item.id}
                                            </td>
                                            <td className="p-2 text-center">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.color}`}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="p-2 text-center">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt=""
                                                        className="w-20 h-20 object-cover rounded border mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={() => setZoomedImage(item.image)}
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                    />
                                                ) : null}
                                                <div 
                                                    className={`w-20 h-20 bg-slate-100 rounded border items-center justify-center mx-auto ${item.image ? 'hidden' : 'flex'} ${item.image ? 'cursor-pointer hover:opacity-80' : ''}`}
                                                    onClick={() => item.image && setZoomedImage(item.image)}
                                                >
                                                    <ImageIcon className="text-slate-300" size={28} />
                                                </div>
                                            </td>
                                            <td className="p-2 font-medium text-sm">{item.name}</td>
                                            <td className="p-2 text-center font-bold text-blue-600">{item.stock}</td>
                                            <td className="p-2 font-mono text-xs text-slate-500">{item.code}</td>
                                            <td className="p-2 text-slate-600 text-xs">{item.location}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* 仓位更新 Modal */}
            {isLocationModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-emerald-50">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-800">
                                <MapPin className="text-emerald-600" />
                                仓位更新与编码提取
                            </h2>
                            <button 
                                onClick={() => setIsLocationModalOpen(false)}
                                className="text-emerald-400 hover:text-emerald-700 transition-colors p-1"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* 批量复制商品编码区域 */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-2">步骤 1：获取最新商品编码</h3>
                                <p className="text-xs text-slate-500 mb-4">
                                    一键复制历史排品中所有的商品编码，方便前往 ERP 导出仓位数据。注意：手机端无法复制。
                                </p>
                                <button
                                    onClick={handleCopyProductCodes}
                                    disabled={isCopyingCodes}
                                    className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors border shadow-sm ${
                                        isCopyingCodes 
                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                            : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 active:bg-emerald-100'
                                    }`}
                                >
                                    <Copy size={18} />
                                    {isCopyingCodes ? '提取复制中...' : '批量复制商品编码 (逗号分隔)'}
                                </button>
                            </div>

                            {/* 拖拽/上传更新仓位区域 */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                                <h3 className="text-sm font-bold text-slate-700 mb-2">步骤 2：导入包含最新仓位的表格</h3>
                                <p className="text-xs text-slate-500 mb-4">
                                    上传表格进行匹配更新，表格中需包含「<span className="font-semibold text-slate-700">商品名称</span>」与「<span className="font-semibold text-slate-700">主仓位 或 仓位</span>」两列。
                                </p>
                                
                                <label 
                                    className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                        isUpdatingLocation 
                                            ? 'border-emerald-200 bg-emerald-50 opacity-70 cursor-not-allowed'
                                            : 'border-emerald-300 bg-white hover:bg-emerald-50 hover:border-emerald-400'
                                    }`}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (isUpdatingLocation) return;
                                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                            const fakeEvent = { target: { files: e.dataTransfer.files } };
                                            handleLocationUpdate(fakeEvent);
                                        }
                                    }}
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                                        <MapPin className={`w-8 h-8 mb-3 ${isUpdatingLocation ? 'text-emerald-400 animate-pulse' : 'text-emerald-500'}`} />
                                        <p className="mb-1 text-sm text-slate-600 font-medium">
                                            {isUpdatingLocation ? '正在处理并更新...' : '点击或将 Excel 文件拖拽到这里'}
                                        </p>
                                        <p className="text-xs text-slate-400">支持 .xlsx 或 .xls 文件</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept=".xlsx, .xls"
                                        disabled={isUpdatingLocation}
                                        onChange={handleLocationUpdate}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 历史记录 Modal */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                        
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                <History className="text-indigo-600" />
                                历史排品记录 (从 Supabase 加载)
                            </h2>
                            <button 
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-slate-100">
                            {isLoadingHistory ? (
                                <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                                    <p>正在从数据库加载记录...</p>
                                </div>
                            ) : historyData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-slate-500 bg-white rounded-lg border border-dashed">
                                    <AlertCircle size={32} className="mb-2 text-slate-400" />
                                    <p>没有找到任何历史记录。</p>
                                </div>
                            ) : (
                                <Card>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                                    <th className="p-3 w-16 text-center">序号</th>
                                                    <th className="p-3 w-16 text-center">分类</th>
                                                    <th className="p-3 w-24 text-center">预览</th>
                                                    <th className="p-3 w-48">商品名称</th>
                                                    <th className="p-3 w-16 text-center">可用数</th>
                                                    <th className="p-3 w-28">商品编码</th>
                                                    <th className="p-3 w-20">仓位</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-sm">
                                                {historyData.map((item, idx) => {
                                                    // 根据 category_type 设置颜色
                                                    let colorClass = 'bg-slate-100 text-slate-800';
                                                    if(item.category_type === 'welfare') colorClass = 'bg-blue-100 text-blue-800';
                                                    if(item.category_type === 'orphan') colorClass = 'bg-purple-100 text-purple-800';
                                                    if(item.category_type === 'unsaleable') colorClass = 'bg-orange-100 text-orange-800';

                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-2 font-mono font-bold text-center text-slate-700">
                                                                #{item.product_id}
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                                                                    {item.category}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                {item.image_url ? (
                                                                    <img
                                                                        src={item.image_url}
                                                                        alt=""
                                                                        className="w-20 h-20 object-cover rounded border mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                                                                        onClick={() => setZoomedImage(item.image_url)}
                                                                        referrerPolicy="no-referrer"
                                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                                    />
                                                                ) : null}
                                                                <div 
                                                                    className={`w-20 h-20 bg-slate-100 rounded border items-center justify-center mx-auto ${item.image_url ? 'hidden' : 'flex'} ${item.image_url ? 'cursor-pointer hover:opacity-80' : ''}`}
                                                                    onClick={() => item.image_url && setZoomedImage(item.image_url)}
                                                                >
                                                                    <ImageIcon className="text-slate-300" size={28} />
                                                                </div>
                                                            </td>
                                                            <td className="p-2 font-medium text-sm">{item.product_name}</td>
                                                            <td className="p-2 text-center font-bold text-blue-600">{item.stock}</td>
                                                            <td className="p-2 font-mono text-xs text-slate-500">{item.product_code}</td>
                                                            <td className="p-2 text-slate-600 text-xs">{item.location}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-3 bg-slate-50 text-xs text-slate-500 border-t text-right">
                                        共计 {historyData.length} 条排品记录 (上传于: {historyData[0] ? new Date(historyData[0].created_at).toLocaleString() : '-'})
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 图片放大 Modal */}
            {zoomedImage && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75 p-4 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <img 
                        src={zoomedImage} 
                        alt="Zoomed" 
                        referrerPolicy="no-referrer"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default" 
                        onClick={(e) => e.stopPropagation()} 
                    />
                    <button 
                        className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-80 rounded-full p-2 transition-colors cursor-pointer"
                        onClick={() => setZoomedImage(null)}
                    >
                        <X size={32} />
                    </button>
                </div>
            )}
        </div>
    );
}