import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileSpreadsheet, Calculator, Trash2, Image as ImageIcon, AlertCircle, Download, PackageOpen, Tag, Layers, RefreshCw } from 'lucide-react';

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
                    const name = getField(sourceItem, '商品名称', 'Name', 'Title', 'name', 'title');
                    const code = getField(sourceItem, '商品编码', 'Code', 'SKU', 'code', 'sku');
                    const location = getField(sourceItem, '主仓位', 'Location', '仓位', 'location');
                    const image = getField(sourceItem, '图片', '图片链接', 'Image', 'Pic', 'image', 'url');

                    allResults.push({
                        id: currentId,
                        category: label,
                        categoryType: type,
                        name, code, location, image, color
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
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-slate-500 text-sm flex items-center gap-2">
                                {libLoaded ? <span className="text-green-600 font-medium">● 系统就绪</span> : '⏳ 加载组件...'}
                                <span className="text-slate-300">|</span>
                                <span className="text-green-600">配置已加载</span>
                            </p>
                            <button onClick={loadConfigs} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors border border-slate-200">
                                <RefreshCw size={12} /> 重新加载配置
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="bg-white border hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                            <Download size={16} /> 导出结果
                        </button>
                        <button onClick={calculate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md font-medium flex items-center gap-2 transition-transform active:scale-95">
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
                                return (
                                    <div key={key} className={`p-3 rounded border relative ${info.status === 'warning' ? 'bg-red-50 border-red-200' : `bg-${color}-50 border-${color}-100`}`}>
                                        <div className={`text-xs font-bold uppercase text-${color}-600 mb-1 flex justify-between`}>
                                            {label}
                                            {info.status === 'warning' && <AlertCircle size={14} className="text-red-500" />}
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <div className="text-xs text-slate-500">生成ID: {info.idCount}</div>
                                                <div className={`text-xl font-bold text-${color}-900`}>实分: {info.actual}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-400">需提取源</div>
                                                <div className="font-mono text-sm">{info.extractNeed}</div>
                                            </div>
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
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                        <th className="p-4 w-24">序号 (ID)</th>
                                        <th className="p-4 w-24">分类</th>
                                        <th className="p-4 w-32">预览</th>
                                        <th className="p-4">商品名称</th>
                                        <th className="p-4 w-40">编码 (SKU)</th>
                                        <th className="p-4 w-32">仓位</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {results.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 font-mono font-bold text-lg text-slate-700">
                                                #{item.id}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${item.color}`}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {item.image ? (
                                                    <img src={item.image} alt="" className="w-16 h-16 object-cover rounded border" />
                                                ) : (
                                                    <div className="w-16 h-16 bg-slate-100 rounded border flex items-center justify-center">
                                                        <ImageIcon className="text-slate-300" size={24} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 font-medium">{item.name}</td>
                                            <td className="p-4 font-mono text-xs text-slate-500">{item.code}</td>
                                            <td className="p-4 text-slate-600">{item.location}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}