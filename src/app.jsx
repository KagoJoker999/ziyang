import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Settings, Calculator, Trash2, Image as ImageIcon, AlertCircle, Download, PackageOpen, Tag, Layers, Save, Plus, X, Edit3, Repeat, ListOrdered, FileJson, Check } from 'lucide-react';

// --- 组件：卡片容器 ---
const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
        {children}
    </div>
);

// --- 组件：通用模态框 ---
const Modal = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>
                {footer && (
                    <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 组件：JSON 全局编辑器 ---
const JsonConfigEditor = ({ config, onSave, onClose }) => {
    const [jsonText, setJsonText] = useState(JSON.stringify(config, null, 2));
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setJsonText(e.target.value);
        setError(null);
    };

    const handleSave = () => {
        try {
            const parsed = JSON.parse(jsonText);
            // 简单校验结构
            if (!parsed.welfare || !parsed.orphan || !parsed.unsaleable) {
                throw new Error("缺少必要的分类键值 (welfare, orphan, unsaleable)");
            }
            onSave(parsed);
            onClose();
        } catch (e) {
            setError(e.message);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded mb-4 text-sm text-amber-800">
                ⚠️ 这是高级配置模式。您可以直接编辑所有规则。修改前请确保 JSON 格式正确。
            </div>
            <textarea
                className={`flex-1 w-full h-96 font-mono text-sm p-4 border rounded focus:ring-2 outline-none resize-none ${error ? 'border-red-500 ring-red-100' : 'border-slate-300 focus:ring-blue-500'}`}
                value={jsonText}
                onChange={handleChange}
                spellCheck={false}
            />
            {error && <div className="text-red-600 text-sm mt-2 flex items-center gap-1"><AlertCircle size={14} /> 格式错误: {error}</div>}

            <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">取消</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                    <Save size={16} /> 保存配置文件
                </button>
            </div>
        </div>
    );
};

// --- 组件：上传与展示区域 ---
const DropZone = ({ title, type, onFileLoaded, data, onClear, config, onOpenConfig, colorClass, icon: Icon, requiredSourceCount, totalIds }) => {
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

    // 生成简短的区间描述
    const rangeSummary = config.ranges.map(r => `${r.start}-${r.end}(步${r.step})`).join(', ');

    return (
        <Card className="flex flex-col h-full relative group">
            <div className={`p-4 border-b ${colorClass} bg-opacity-10 flex items-center justify-between`}>
                <div className="flex items-center gap-2 font-bold text-slate-700">
                    <Icon size={20} />
                    {title}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onOpenConfig(type)}
                        className="text-slate-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-white"
                        title="配置规则"
                    >
                        <Settings size={18} />
                    </button>
                    {data && (
                        <button onClick={() => onClear(type)} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-white" title="清除数据">
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* 状态展示区 */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <div className="text-xs text-slate-500">
                        <span className="font-bold block text-slate-700 mb-1">序号规则 (共{totalIds}个ID):</span>
                        <span className="font-mono bg-white px-1 border rounded text-slate-600 block truncate max-w-[150px]" title={rangeSummary}>
                            {rangeSummary || "未配置"}
                        </span>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-500 font-bold mb-1">需从Excel提取</div>
                        <div className={`text-xl font-bold ${requiredSourceCount > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                            {requiredSourceCount} <span className="text-xs font-normal text-slate-400">个</span>
                        </div>
                    </div>
                </div>

                {/* 修改配置按钮已隐藏 */}

                <div className="flex gap-2 text-[10px] font-medium">
                    {config.isRepeatable ? (
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1 border border-purple-200">
                            <Repeat size={10} /> 循环填充 (取Top{config.extractCount || 5})
                        </span>
                    ) : (
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded flex items-center gap-1 border border-slate-200">
                            <ListOrdered size={10} /> 对应填充 (不重复)
                        </span>
                    )}
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

// --- 组件：UI 配置编辑器 ---
const ConfigEditor = ({ config, onChange, typeLabel }) => {
    const [localConfig, setLocalConfig] = useState(JSON.parse(JSON.stringify(config)));

    // 计算生成的 ID 总数
    const totalIds = localConfig.ranges.reduce((sum, r) => {
        if (r.end < r.start || r.step <= 0) return sum;
        return sum + Math.floor((r.end - r.start) / r.step) + 1;
    }, 0);

    // 计算需要从 Excel 提取的数量
    const extractNeed = localConfig.isRepeatable
        ? (localConfig.extractCount || 5)
        : totalIds;

    const update = (newConfig) => {
        setLocalConfig(newConfig);
        if (onChange) onChange(newConfig); // 实时传回父组件供临时保存
    };

    const handleRangeChange = (idx, field, value) => {
        const newRanges = [...localConfig.ranges];
        newRanges[idx][field] = parseInt(value) || 0;
        update({ ...localConfig, ranges: newRanges });
    };

    const addRange = () => {
        update({
            ...localConfig,
            ranges: [...localConfig.ranges, { start: 0, end: 0, step: 1 }]
        });
    };

    const removeRange = (idx) => {
        const newRanges = localConfig.ranges.filter((_, i) => i !== idx);
        update({ ...localConfig, ranges: newRanges });
    };

    const toggleRepeat = (e) => {
        update({ ...localConfig, isRepeatable: e.target.checked });
    };

    const handleExtractCountChange = (e) => {
        update({ ...localConfig, extractCount: parseInt(e.target.value) || 0 });
    };

    return (
        <div className="space-y-6">
            {/* 顶部概览 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                    <div className="text-xs text-blue-500 uppercase font-bold mb-1">将生成 ID 总数</div>
                    <div className="text-2xl font-bold text-blue-800">{totalIds}</div>
                    <div className="text-[10px] text-blue-400">根据区间计算</div>
                </div>
                <div className={`p-4 rounded-lg border text-center ${localConfig.isRepeatable ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`text-xs uppercase font-bold mb-1 ${localConfig.isRepeatable ? 'text-purple-500' : 'text-slate-500'}`}>需从 Excel 提取</div>
                    <div className={`text-2xl font-bold ${localConfig.isRepeatable ? 'text-purple-800' : 'text-slate-700'}`}>{extractNeed}</div>
                    <div className={`text-[10px] ${localConfig.isRepeatable ? 'text-purple-400' : 'text-slate-400'}`}>
                        {localConfig.isRepeatable ? "固定提取配置值" : "与 ID 总数一致"}
                    </div>
                </div>
            </div>

            {/* 提取策略配置 */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Settings size={14} /> 提取策略配置
                </h5>

                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="pt-1">
                            <input
                                type="checkbox"
                                id="repeat_check"
                                checked={localConfig.isRepeatable || false}
                                onChange={toggleRepeat}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                        </div>
                        <label htmlFor="repeat_check" className="cursor-pointer flex-1">
                            <span className="font-bold text-sm text-slate-800">允许重复使用 (循环填充)</span>
                            <p className="text-xs text-slate-500 mt-1">
                                {localConfig.isRepeatable
                                    ? "开启后，系统将只提取指定数量的商品，然后循环使用它们填满所有生成的序号。"
                                    : "关闭后，每个生成的序号必须对应表格中一个唯一的商品。"}
                            </p>
                        </label>
                    </div>

                    {localConfig.isRepeatable && (
                        <div className="ml-7 bg-white p-3 border border-slate-200 rounded animate-fadeIn">
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                固定提取数量 (Extract Count)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={localConfig.extractCount || 5}
                                    onChange={handleExtractCountChange}
                                    className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <span className="text-xs text-slate-400">从库存最多的商品中提取前 {localConfig.extractCount || 5} 个</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 区间配置 */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-700">序号区间设置</label>
                    <button onClick={addRange} className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 transition-colors">
                        <Plus size={14} /> 添加区间
                    </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {localConfig.ranges.map((range, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                            <div className="flex-1 grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">起始</label>
                                    <input
                                        type="number"
                                        value={range.start}
                                        onChange={(e) => handleRangeChange(idx, 'start', e.target.value)}
                                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">结束</label>
                                    <input
                                        type="number"
                                        value={range.end}
                                        onChange={(e) => handleRangeChange(idx, 'end', e.target.value)}
                                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">步长</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={range.step}
                                        onChange={(e) => handleRangeChange(idx, 'step', e.target.value)}
                                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => removeRange(idx)}
                                className="text-slate-400 hover:text-red-500 mt-4 p-1"
                                disabled={localConfig.ranges.length === 1}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function App() {
    const [libLoaded, setLibLoaded] = useState(false);
    const [isSaved, setIsSaved] = useState(true);

    // 模态框状态
    const [uiModalOpen, setUiModalOpen] = useState(false);
    const [jsonModalOpen, setJsonModalOpen] = useState(false);
    const [currentEditingType, setCurrentEditingType] = useState(null);

    // 临时状态（用于 Modal 内部）
    const [tempConfigState, setTempConfigState] = useState(null);

    // 默认配置
    const defaultConfigs = {
        welfare: {
            ranges: [{ start: 1000, end: 1100, step: 1 }],
            isRepeatable: true,
            extractCount: 5
        },
        orphan: {
            ranges: [{ start: 2000, end: 2050, step: 2 }],
            isRepeatable: false,
            extractCount: 0 // 不重复时不使用此字段，但保留结构一致性
        },
        unsaleable: {
            ranges: [{ start: 3000, end: 3020, step: 1 }],
            isRepeatable: false,
            extractCount: 0
        }
    };

    const [configs, setConfigs] = useState(defaultConfigs);

    // 原始数据状态
    const [rawData, setRawData] = useState({
        welfare: null,
        orphan: null,
        unsaleable: null
    });

    const [results, setResults] = useState([]);
    const [stats, setStats] = useState(null);

    // --- 初始化 ---
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

        const saved = localStorage.getItem('product_sort_configs_v4');
        if (saved) {
            try {
                setConfigs(JSON.parse(saved));
            } catch (e) { console.error("Config parse error"); }
        }
    }, []);

    // --- 自动保存到本地存储 ---
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem('product_sort_configs_v4', JSON.stringify(configs));
            setIsSaved(true);
        }, 1000);
        return () => clearTimeout(timer);
    }, [configs]);

    const handleFileLoaded = (type, rows, fileName) => {
        setRawData(prev => ({ ...prev, [type]: { rows, fileName } }));
    };

    const handleClear = (type) => {
        setRawData(prev => ({ ...prev, [type]: null }));
        setResults([]);
        setStats(null);
    };

    // --- UI 模态框逻辑 ---
    const openUiConfig = (type) => {
        setCurrentEditingType(type);
        setTempConfigState(JSON.parse(JSON.stringify(configs[type])));
        setUiModalOpen(true);
    };

    const saveUiConfig = () => {
        if (currentEditingType && tempConfigState) {
            setIsSaved(false);
            setConfigs(prev => ({
                ...prev,
                [currentEditingType]: tempConfigState
            }));
            setUiModalOpen(false);
        }
    };

    // --- JSON 全局配置逻辑 ---
    const openJsonConfig = () => {
        setJsonModalOpen(true);
    };

    const saveJsonConfig = (newGlobalConfig) => {
        setIsSaved(false);
        setConfigs(newGlobalConfig);
        setJsonModalOpen(false);
    };

    // --- 辅助计算函数 ---

    // 1. 计算总 ID 数量
    const getTotalIdCount = (conf) => {
        if (!conf.ranges) return 0;
        return conf.ranges.reduce((sum, r) => {
            if (r.end < r.start || r.step <= 0) return sum;
            return sum + Math.floor((r.end - r.start) / r.step) + 1;
        }, 0);
    };

    // 2. 计算需要从 Excel 提取的源商品数量
    const getRequiredSourceCount = (conf) => {
        if (conf.isRepeatable) {
            // 如果允许重复，提取数量由 extractCount 决定
            return conf.extractCount || 5;
        } else {
            // 如果不允许重复，提取数量 = ID 数量
            return getTotalIdCount(conf);
        }
    };

    // 3. 生成所有目标 ID
    const generateTargetIds = (ranges) => {
        let ids = [];
        ranges.forEach(r => {
            if (r.step <= 0) return;
            for (let i = r.start; i <= r.end; i += r.step) {
                ids.push(i);
            }
        });
        return [...new Set(ids)].sort((a, b) => a - b);
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
            const conf = configs[type];
            const targetIds = generateTargetIds(conf.ranges);
            const totalIds = targetIds.length;

            // 计算需要提取多少行
            const extractNeed = conf.isRepeatable ? (conf.extractCount || 5) : totalIds;

            statistics.details[type] = {
                idCount: totalIds,
                extractNeed: extractNeed,
                actual: 0,
                status: 'ok'
            };

            if (!rawData[type] || totalIds <= 0) return;

            let rows = [...rawData[type].rows];

            // 1. 统一排序：按库存/可用数 降序
            rows.sort((a, b) => {
                const stockA = getNumberField(a, '可用数', '数量', '库存', 'Stock', 'Qty');
                const stockB = getNumberField(b, '可用数', '数量', '库存', 'Stock', 'Qty');
                return stockB - stockA;
            });

            // 2. 筛选源商品池
            let sourcePool = [];

            // 总是取前 N 个 (N = extractNeed)
            // 如果 Excel 行数不够，就取全部
            sourcePool = rows.slice(0, extractNeed);

            // 检查数量是否足够 (仅针对不可重复的场景报警，重复场景只要有1个就能跑)
            if (!conf.isRepeatable && sourcePool.length < extractNeed) {
                statistics.details[type].status = 'warning';
            }
            if (conf.isRepeatable && sourcePool.length === 0) {
                return; // 没数据无法循环
            }

            // 3. 分配 ID
            // 遍历所有生成的 ID
            targetIds.forEach((currentId, index) => {
                let sourceItem;

                if (conf.isRepeatable) {
                    // 循环取值：从 sourcePool 中循环拿
                    sourceItem = sourcePool[index % sourcePool.length];
                } else {
                    // 对应取值：每个 ID 对应一个源商品
                    // 如果 sourcePool 耗尽，则停止分配或者留空 (这里选择停止分配)
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

    const getLabel = (type) => {
        if (type === 'welfare') return '福利品';
        if (type === 'orphan') return '孤品';
        return '滞销品';
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">

            {/* 1. UI 配置模态框 (单分类编辑) */}
            <Modal
                isOpen={uiModalOpen}
                onClose={() => setUiModalOpen(false)}
                title={`配置规则 - ${currentEditingType ? getLabel(currentEditingType) : ''}`}
                footer={
                    <>
                        <button onClick={() => setUiModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">取消</button>
                        <button onClick={saveUiConfig} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                            <Check size={16} /> 确认修改
                        </button>
                    </>
                }
            >
                {currentEditingType && tempConfigState && (
                    <ConfigEditor
                        config={tempConfigState}
                        typeLabel={getLabel(currentEditingType)}
                        onChange={(newConf) => setTempConfigState(newConf)}
                    />
                )}
            </Modal>

            {/* 2. JSON 全局配置模态框 */}
            <Modal
                isOpen={jsonModalOpen}
                onClose={() => setJsonModalOpen(false)}
                title="📜 全局规则配置文件 (JSON)"
            >
                <JsonConfigEditor
                    config={configs}
                    onSave={saveJsonConfig}
                    onClose={() => setJsonModalOpen(false)}
                />
            </Modal>

            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <PackageOpen className="text-blue-600" />
                            商品智能分拣系统 <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">v4.0</span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                            {libLoaded ? <span className="text-green-600 font-medium">● 系统就绪</span> : '⏳ 加载组件...'}
                            <span className="text-slate-300">|</span>
                            {isSaved ? (
                                <span className="flex items-center gap-1 text-slate-400"><Save size={12} /> 配置已保存</span>
                            ) : (
                                <span className="flex items-center gap-1 text-amber-500"><Save size={12} className="animate-pulse" /> 保存中...</span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {/* 全局规则配置按钮已隐藏 */}
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
                        config={configs.welfare}
                        onOpenConfig={openUiConfig}
                        onFileLoaded={handleFileLoaded}
                        onClear={handleClear}
                        requiredSourceCount={getRequiredSourceCount(configs.welfare)}
                        totalIds={getTotalIdCount(configs.welfare)}
                    />
                    <DropZone
                        title="孤品区"
                        type="orphan"
                        icon={Layers}
                        colorClass="bg-purple-500 border-purple-200"
                        data={rawData.orphan}
                        config={configs.orphan}
                        onOpenConfig={openUiConfig}
                        onFileLoaded={handleFileLoaded}
                        onClear={handleClear}
                        requiredSourceCount={getRequiredSourceCount(configs.orphan)}
                        totalIds={getTotalIdCount(configs.orphan)}
                    />
                    <DropZone
                        title="滞销品区"
                        type="unsaleable"
                        icon={AlertCircle}
                        colorClass="bg-orange-500 border-orange-200"
                        data={rawData.unsaleable}
                        config={configs.unsaleable}
                        onOpenConfig={openUiConfig}
                        onFileLoaded={handleFileLoaded}
                        onClear={handleClear}
                        requiredSourceCount={getRequiredSourceCount(configs.unsaleable)}
                        totalIds={getTotalIdCount(configs.unsaleable)}
                    />
                </div>

                {/* 统计与结果区 */}
                {stats && (
                    <Card className="p-5 bg-white">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                            <Settings className="text-slate-400" size={20} />
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
                                                <span className={`px-2 py-1 rounded text-xs font-bold shadow-sm ${item.color}`}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {item.image ? (
                                                    <div className="w-16 h-16 bg-white rounded border border-slate-200 overflow-hidden relative shadow-sm">
                                                        <img
                                                            src={item.image}
                                                            alt="preview"
                                                            className="w-full h-full object-contain"
                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 bg-slate-50 rounded border border-slate-200 flex items-center justify-center text-slate-300">
                                                        <ImageIcon size={20} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 font-medium text-slate-800">
                                                {item.name}
                                            </td>
                                            <td className="p-4 font-mono text-slate-600 select-all">
                                                {item.code}
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {item.location}
                                            </td>
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