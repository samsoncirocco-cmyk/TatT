/**
 * Generate Page - Enhanced with Layer Management
 * 
 * Integrates prompt interface, vibe chips, and canvas layer management
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { BodyPartSelector } from '../components/generate/BodyPartSelector';
import { ForgeCanvas } from '../components/generate/ForgeCanvas';
import { BodyPartWarningModal } from '../components/generate/BodyPartWarningModal';
import PromptInterface from '../components/generate/PromptInterface';
import VibeChips from '../components/generate/VibeChips';
import AdvancedOptions from '../components/generate/AdvancedOptions';
import LayerStack from '../components/generate/LayerStack';
import MatchPulseSidebar from '../components/generate/MatchPulseSidebar';
import KeyboardShortcutsModal, { useKeyboardShortcuts } from '../components/KeyboardShortcutsModal';
import BlendModeSelector from '../components/generate/BlendModeSelector';
import ErrorBoundary from '../components/ErrorBoundary';
import StencilExport from '../components/StencilExport';
import InpaintingEditor from '../components/InpaintingEditor';
import VersionTimeline from '../components/generate/VersionTimeline';
import VersionComparison from '../components/generate/VersionComparison';
import { ToastContainer } from '../components/ui/Toast';
import { DEFAULT_BODY_PART } from '../constants/bodyPartAspectRatios';
import { enhancePrompt } from '../services/councilService';
import useVibeChipSuggestions from '../hooks/useVibeChipSuggestions';
import { useLayerManagement } from '../hooks/useLayerManagement';
import { useArtistMatching } from '../hooks/useArtistMatching';
import { useCanvasAspectRatio } from '../hooks/useCanvasAspectRatio';
import { useVersionHistory } from '../hooks/useVersionHistory';
import { useToast } from '../hooks/useToast';
import { useStorageWarning } from '../hooks/useStorageWarning';
import * as versionService from '../services/versionService';
import Button from '../components/ui/Button';
import { Wand2, Zap, Download, Sparkles } from 'lucide-react';
import { useImageGeneration } from '../hooks/useImageGeneration';
import TransformControls from '../components/generate/TransformControls';
import { exportAsPNG, exportAsARAsset } from '../services/canvasService';
import { convertToStencil } from '../services/stencilService';

const TRENDING_EXAMPLES = [
    {
        id: 'cyberpunk-gohan',
        title: 'Cyberpunk Gohan',
        description: 'Neon energy, bold anime contrasts',
        bodyPart: 'forearm',
        prompt: 'Cyberpunk Gohan in a neon rainstorm with electric aura',
        layers: [
            {
                imageUrl: 'https://replicate.delivery/czjl/OAumTJvdtXaeLiQumdkjD7jju51vsyhnVfi5wldFfXNlyqprA/out-0.png',
                type: 'background'
            },
            {
                imageUrl: 'https://replicate.delivery/czjl/lYeP23W6shTf00JafdGfBoegdC8xvUHfcu6tW3yL5LpoUWNdF/out-1.png',
                type: 'subject'
            }
        ]
    },
    {
        id: 'fine-line-peonies',
        title: 'Fine-line Peonies',
        description: 'Delicate florals with clean linework',
        bodyPart: 'thigh',
        prompt: 'Fine-line peonies with soft shading and airy spacing',
        layers: [
            {
                imageUrl: 'https://replicate.delivery/czjl/6g9AaNGStorfKSigYIwegRINxNm8ofQUNutAQ8qscTgkyqprA/out-2.png',
                type: 'subject'
            },
            {
                imageUrl: 'https://replicate.delivery/czjl/rfeJyinHStsMfoVhJtLHCHfwEuoH3L2wOiO4a4W7iSoe5z2TA/out-0.png',
                type: 'background'
            }
        ]
    },
    {
        id: 'dragon-storm',
        title: 'Dragon Storm',
        description: 'High energy with lightning accents',
        bodyPart: 'back',
        prompt: 'A coiling dragon with lightning and storm clouds',
        layers: [
            {
                imageUrl: 'https://replicate.delivery/czjl/ARB5YiaRQZaoOp5qCs7FejWBwzb3kGpwVNQAxbNqj1Ufa10VA/out-0.png',
                type: 'subject'
            },
            {
                imageUrl: 'https://replicate.delivery/czjl/gkz5hfI91LUBcSPBVVR3ms1SQXfM4vl0nNQsbzD8rBWVRVqrA/out-1.png',
                type: 'effect'
            }
        ]
    },
    {
        id: 'neo-trad-owl',
        title: 'Neo-Trad Owl',
        description: 'Warm gradients with bold lines',
        bodyPart: 'shoulder',
        prompt: 'Neo-traditional owl with botanical accents',
        layers: [
            {
                imageUrl: 'https://replicate.delivery/czjl/RHcvkMuztQ6oHt0O1fOpvXstxgfnXxkEWwZKOUl9EQOdx2TA/out-2.png',
                type: 'subject'
            },
            {
                imageUrl: 'https://replicate.delivery/czjl/HGruec7PlX3wNaEKuo9WU6Cdo9g0LVQfOE6Vw2vBPVLj1qprA/out-0.png',
                type: 'background'
            }
        ]
    },
    {
        id: 'blackwork-serpent',
        title: 'Blackwork Serpent',
        description: 'Bold ink, high contrast textures',
        bodyPart: 'ribs',
        prompt: 'Blackwork serpent with geometric halo',
        layers: [
            {
                imageUrl: 'https://replicate.delivery/czjl/uIgR4XfJdlUtPqinaO1adfJoUU9Jb2pUOmXbGiGx6R2Z1qprA/out-1.png',
                type: 'subject'
            },
            {
                imageUrl: 'https://replicate.delivery/czjl/c4U86xgeEqULG6xLLMEtETP3yEVytcE87O0DFm9vymfw1qprA/out-2.png',
                type: 'effect'
            }
        ]
    },
    {
        id: 'japanese-crane',
        title: 'Japanese Crane',
        description: 'Classic Irezumi balance',
        bodyPart: 'chest',
        prompt: 'Japanese crane with waves and maple leaves',
        layers: [
            {
                imageUrl: 'https://replicate.delivery/czjl/OgzsNpXOluadKhDXSvHsEWM4ukvx7g3IYXYd1GLeK1Yy1qprA/out-0.png',
                type: 'subject'
            },
            {
                imageUrl: 'https://replicate.delivery/czjl/cXoNeAJ4H3WaRCm06hFYpNwwkZTE1lvoA6CwEnSTTtZP1qprA/out-1.png',
                type: 'background'
            }
        ]
    }
];

export default function Generate() {
    // Body part state
    const [bodyPart, setBodyPart] = useState(DEFAULT_BODY_PART);
    const [showWarning, setShowWarning] = useState(false);
    const [pendingBodyPart, setPendingBodyPart] = useState(null);

    // Prompt state
    const [promptText, setPromptText] = useState('');
    const [selectedChips, setSelectedChips] = useState([]);
    const [enhancedPrompt, setEnhancedPrompt] = useState(null);
    const [isEnhancing, setIsEnhancing] = useState(false);

    // Advanced options state
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [size, setSize] = useState('medium');
    const [aiModel, setAiModel] = useState('tattoo');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [enhancementLevel, setEnhancementLevel] = useState('detailed');

    const [sessionId, setSessionId] = useState(() => {
        const stored = sessionStorage.getItem('tattester_session_id');
        if (stored) return stored;
        const created = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem('tattester_session_id', created);
        return created;
    });

    const {
        versions,
        currentVersionId,
        addVersion,
        loadVersion,
        removeVersion
    } = useVersionHistory(sessionId);

    const {
        layers,
        sortedLayers,
        selectedLayerId,
        addLayer,
        deleteLayer,
        reorder,
        toggleVisibility,
        rename,
        selectLayer,
        updateTransform,
        flipHorizontal,
        flipVertical,
        clearLayers,
        replaceLayers,
        updateImage,
        updateBlendMode
    } = useLayerManagement();

    const resolvedStyle = selectedChips[0] || 'Traditional';

    // Toast and storage monitoring
    const { toast, toasts, removeToast } = useToast();
    useStorageWarning(toast);

    // Generation hook
    const {
        generateHighRes,
        isGenerating,
        error: generationError,
        progress,
        queueLength,
        arAsset
    } = useImageGeneration({
        userInput: {
            subject: enhancedPrompt || promptText,
            style: resolvedStyle,
            bodyPart: bodyPart,
            size,
            aiModel,
            negativePrompt
        }
    });

    // UI state
    const [isLoadingExample, setIsLoadingExample] = useState(false);
    const [showInpainting, setShowInpainting] = useState(false);
    const [restyleLayerId, setRestyleLayerId] = useState(null);
    const [restyleStyle, setRestyleStyle] = useState('');
    const [comparison, setComparison] = useState(null);

    // Keyboard shortcuts
    const keyboardShortcuts = useKeyboardShortcuts();
    const [stencilView, setStencilView] = useState(false);
    const [stencilPreview, setStencilPreview] = useState(null);
    const [isStencilProcessing, setIsStencilProcessing] = useState(false);
    const [stencilError, setStencilError] = useState(null);
    const [stencilSourceUrl, setStencilSourceUrl] = useState(null);
    const [showStencilExport, setShowStencilExport] = useState(false);

    // Vibe chip suggestions
    const { suggestions, isLoading: isSuggestionsLoading } = useVibeChipSuggestions(promptText);
    const { width: canvasWidth, height: canvasHeight } = useCanvasAspectRatio(bodyPart);

    const selectedLayer = useMemo(() => (
        layers.find(layer => layer.id === selectedLayerId) || null
    ), [layers, selectedLayerId]);

    const matchStyle = resolvedStyle;

    const matchContext = useMemo(() => ({
        style: matchStyle,
        bodyPart,
        layerCount: layers.length,
        location: null,
        embeddingVector: null
    }), [bodyPart, layers.length, matchStyle]);

    const {
        matches,
        totalMatches,
        isLoading: isMatching,
        error: matchError
    } = useArtistMatching({ context: matchContext, debounceMs: 2000 });

    const timeline = useMemo(() => (
        versionService.getVersionTimeline(sessionId)
    ), [sessionId, versions]);

    const createSessionId = useCallback(() => (
        `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    ), []);

    const resetSession = useCallback(() => {
        const newSessionId = createSessionId();
        sessionStorage.setItem('tattester_session_id', newSessionId);
        setSessionId(newSessionId);
        setComparison(null);
    }, [createSessionId]);

    const buildVersionPayload = useCallback((overrides = {}) => {
        const resolvedLayers = overrides.layers || sortedLayers;
        return {
            prompt: promptText,
            enhancedPrompt,
            parameters: {
                size,
                aiModel,
                negativePrompt,
                enhancementLevel,
                bodyPart,
                vibeChips: selectedChips
            },
            layers: resolvedLayers,
            imageUrl: overrides.imageUrl || resolvedLayers[resolvedLayers.length - 1]?.imageUrl || null,
            arAssetUrl: overrides.arAssetUrl || arAsset?.url || null,
            stencilUrl: null,
            metadata: {
                bodyPart,
                style: matchStyle
            }
        };
    }, [
        arAsset,
        bodyPart,
        enhancedPrompt,
        enhancementLevel,
        matchStyle,
        negativePrompt,
        promptText,
        selectedChips,
        size,
        aiModel,
        sortedLayers
    ]);

    // Load from session storage on mount
    useEffect(() => {
        const savedState = sessionStorage.getItem('promptState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.promptText) setPromptText(state.promptText);
                if (state.selectedChips) setSelectedChips(state.selectedChips);
                if (state.enhancementLevel) setEnhancementLevel(state.enhancementLevel);
                if (state.enhancedPrompt) setEnhancedPrompt(state.enhancedPrompt);
            } catch (e) {
                console.error('Failed to load saved state:', e);
            }
        }
    }, []);

    // Save to session storage on changes
    useEffect(() => {
        sessionStorage.setItem('promptState', JSON.stringify({
            promptText,
            selectedChips,
            enhancementLevel,
            enhancedPrompt
        }));
    }, [promptText, selectedChips, enhancementLevel, enhancedPrompt]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                return;
            }

            if (!selectedLayerId) return;

            const layer = layers.find(l => l.id === selectedLayerId);
            if (!layer) return;

            const MOVE_STEP = e.shiftKey ? 10 : 1;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    updateTransform(selectedLayerId, { y: layer.transform.y - MOVE_STEP });
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    updateTransform(selectedLayerId, { y: layer.transform.y + MOVE_STEP });
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    updateTransform(selectedLayerId, { x: layer.transform.x - MOVE_STEP });
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    updateTransform(selectedLayerId, { x: layer.transform.x + MOVE_STEP });
                    break;
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    deleteLayer(selectedLayerId);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedLayerId, layers, updateTransform, deleteLayer]);

    const handleBodyPartChange = (newPart) => {
        if (enhancedPrompt) {
            setPendingBodyPart(newPart);
            setShowWarning(true);
        } else {
            setBodyPart(newPart);
        }
    };

    const handleConfirmBodyPartChange = () => {
        if (pendingBodyPart) {
            setBodyPart(pendingBodyPart);
            setEnhancedPrompt(null);
            setPendingBodyPart(null);
        }
        setShowWarning(false);
    };

    const handleCancelBodyPartChange = () => {
        setPendingBodyPart(null);
        setShowWarning(false);
    };

    const handleChipSelect = (chip) => {
        setSelectedChips(prev => {
            if (prev.includes(chip)) {
                return prev.filter(c => c !== chip);
            } else {
                return [...prev, chip];
            }
        });
    };

    const handleEnhance = async () => {
        setIsEnhancing(true);
        try {
            const fullPrompt = [promptText, ...selectedChips].join(', ');

            const result = await enhancePrompt({
                userIdea: fullPrompt,
                style: matchStyle,
                bodyPart: bodyPart
            });

            setEnhancedPrompt(result.prompts[enhancementLevel]);

            if (!negativePrompt && result.negativePrompt) {
                setNegativePrompt(result.negativePrompt);
            }
        } catch (error) {
            console.error('Enhancement failed:', error);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleGenerate = async () => {
        if (!promptText.trim() && !enhancedPrompt?.trim()) return;

        try {
            const result = await generateHighRes();

            if (result && result.images && result.images.length > 0) {
                const newLayer = await addLayer(result.images[0], 'subject');
                const nextLayers = [...layers, newLayer];
                addVersion(buildVersionPayload({
                    layers: nextLayers,
                    imageUrl: newLayer.imageUrl,
                    arAssetUrl: arAsset?.url || null
                }));

                console.log('Generation successful:', result);
            }
        } catch (error) {
            console.error('Generation failed:', error);
        }
    };

    const handleStartFromScratch = () => {
        resetSession();
        clearLayers();
        setPromptText('');
        setEnhancedPrompt(null);
        setSelectedChips([]);
    };

    const handleLoadExample = async (example) => {
        setIsLoadingExample(true);
        resetSession();
        clearLayers();
        setBodyPart(example.bodyPart);
        setPromptText(example.prompt || '');
        setEnhancedPrompt(null);
        setSelectedChips([]);

        try {
            const loadedLayers = [];
            for (const layer of example.layers) {
                const newLayer = await addLayer(layer.imageUrl, layer.type);
                loadedLayers.push(newLayer);
            }

            addVersion(buildVersionPayload({
                layers: loadedLayers,
                imageUrl: loadedLayers[loadedLayers.length - 1]?.imageUrl || null
            }));
        } finally {
            setIsLoadingExample(false);
        }
    };

    const createStencilSource = async () => {
        const compositeBlob = await exportAsPNG(sortedLayers, canvasWidth, canvasHeight, 1.0);
        const compositeUrl = URL.createObjectURL(compositeBlob);
        if (stencilSourceUrl) {
            URL.revokeObjectURL(stencilSourceUrl);
        }
        setStencilSourceUrl(compositeUrl);
        return compositeUrl;
    };

    const handleToggleStencil = async () => {
        if (!stencilView) {
            setIsStencilProcessing(true);
            setStencilError(null);
            try {
                const compositeUrl = await createStencilSource();
                const stencil = await convertToStencil(compositeUrl, { invert: true });
                setStencilPreview(stencil);
            } catch (error) {
                console.error('Stencil generation failed:', error);
                setStencilError('Failed to generate stencil preview.');
            } finally {
                setIsStencilProcessing(false);
            }
        }
        setStencilView(!stencilView);
    };

    useEffect(() => {
        if (!stencilView) return;
        let active = true;

        const timer = setTimeout(async () => {
            setIsStencilProcessing(true);
            setStencilError(null);
            try {
                const compositeUrl = await createStencilSource();
                const stencil = await convertToStencil(compositeUrl, { invert: true });
                if (active) {
                    setStencilPreview(stencil);
                }
            } catch (error) {
                if (active) {
                    console.error('Stencil generation failed:', error);
                    setStencilError('Failed to refresh stencil preview.');
                }
            } finally {
                if (active) {
                    setIsStencilProcessing(false);
                }
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [stencilView, sortedLayers, canvasWidth, canvasHeight]);

    useEffect(() => {
        return () => {
            if (stencilSourceUrl) {
                URL.revokeObjectURL(stencilSourceUrl);
            }
        };
    }, [stencilSourceUrl]);

    const handleExportPNG = async () => {
        try {
            const blob = await exportAsPNG(sortedLayers, canvasWidth, canvasHeight);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tattoo-design-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export design. Please try again.');
        }
    };

    const handleExportARAsset = async () => {
        try {
            const blob = await exportAsARAsset(sortedLayers, canvasWidth, canvasHeight);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tattoo-ar-asset-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('AR export failed:', error);
            alert('Failed to export AR asset. Please try again.');
        }
    };

    const handleBlendModeChange = (layerId, blendMode) => {
        updateBlendMode(layerId, blendMode);
    };

    const handleLoadVersion = (versionId) => {
        const version = loadVersion(versionId);
        if (!version) return;

        replaceLayers(version.layers || []);
        if (version.prompt !== undefined) setPromptText(version.prompt || '');
        if (version.enhancedPrompt !== undefined) setEnhancedPrompt(version.enhancedPrompt || null);
        if (version.parameters?.bodyPart) setBodyPart(version.parameters.bodyPart);
        if (version.parameters?.size) setSize(version.parameters.size);
        if (version.parameters?.aiModel) setAiModel(version.parameters.aiModel);
        if (version.parameters?.negativePrompt !== undefined) {
            setNegativePrompt(version.parameters.negativePrompt || '');
        }
        if (version.parameters?.enhancementLevel) setEnhancementLevel(version.parameters.enhancementLevel);
        if (Array.isArray(version.parameters?.vibeChips)) {
            setSelectedChips(version.parameters.vibeChips);
        }
    };

    const handleBranchVersion = (versionId) => {
        const branch = versionService.branchFromVersion(sessionId, versionId);
        if (!branch) return;

        sessionStorage.setItem('tattester_session_id', branch.sessionId);
        setSessionId(branch.sessionId);
        replaceLayers(branch.version.layers || []);
        if (branch.version.prompt !== undefined) setPromptText(branch.version.prompt || '');
        if (branch.version.enhancedPrompt !== undefined) setEnhancedPrompt(branch.version.enhancedPrompt || null);
        if (branch.version.parameters?.bodyPart) setBodyPart(branch.version.parameters.bodyPart);
        if (branch.version.parameters?.size) setSize(branch.version.parameters.size);
        if (branch.version.parameters?.aiModel) setAiModel(branch.version.parameters.aiModel);
        if (branch.version.parameters?.negativePrompt !== undefined) {
            setNegativePrompt(branch.version.parameters.negativePrompt || '');
        }
        if (branch.version.parameters?.enhancementLevel) setEnhancementLevel(branch.version.parameters.enhancementLevel);
        if (Array.isArray(branch.version.parameters?.vibeChips)) {
            setSelectedChips(branch.version.parameters.vibeChips);
        }
    };

    const handleCompareVersions = ({ first, second }) => {
        const compare = versionService.compareVersions(sessionId, first, second);
        if (compare) {
            setComparison({
                versionA: compare.version1,
                versionB: compare.version2
            });
        }
    };

    const handleRestyle = async () => {
        if (!restyleLayerId || !restyleStyle.trim()) return;

        const promptBase = enhancedPrompt || promptText;
        const restylePrompt = [promptBase, restyleStyle].filter(Boolean).join(', ');

        const response = await generateHighRes({
            userInputOverride: {
                subject: restylePrompt,
                style: restyleStyle,
                bodyPart,
                size,
                aiModel,
                negativePrompt
            }
        });

        if (response?.images?.[0]) {
            updateImage(restyleLayerId, response.images[0]);
            const nextLayers = layers.map(layer =>
                layer.id === restyleLayerId ? { ...layer, imageUrl: response.images[0] } : layer
            );
            addVersion(buildVersionPayload({
                layers: nextLayers,
                imageUrl: response.images[0],
                arAssetUrl: arAsset?.url || null
            }));
        }

        setRestyleLayerId(null);
        setRestyleStyle('');
    };

    const handleInpaintSave = (imageUrl) => {
        if (!selectedLayerId || !imageUrl) return;
        updateImage(selectedLayerId, imageUrl);
        const nextLayers = layers.map(layer =>
            layer.id === selectedLayerId ? { ...layer, imageUrl } : layer
        );
        addVersion(buildVersionPayload({
            layers: nextLayers,
            imageUrl
        }));
        setShowInpainting(false);
    };

    return (
        <div className="min-h-screen pt-16 px-4 pb-32">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-black -z-20" />
            <div className="fixed inset-0 bg-gradient-to-br from-blue-950/20 via-black to-black -z-10" />
            <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-ducks-green/10 rounded-full blur-[150px] pointer-events-none -z-10" />

            {/* Header */}
            <div className="text-center mb-12 pt-8" role="banner">
                <h1 className="text-6xl md:text-7xl font-display font-black tracking-tighter text-white mb-3">
                    THE FORGE
                </h1>
                <p className="text-xs font-mono text-ducks-green uppercase tracking-[0.3em]" aria-label="Version 4.2 Neural Ink Generation Engine">
                    Neural Ink Generation Engine // v4.2
                </p>
            </div>

            <div className="max-w-[1800px] mx-auto space-y-10" role="main">
                <section className="glass-panel rounded-3xl border border-white/10 p-6" aria-label="Trending design examples">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div>
                            <p className="text-xs font-mono uppercase tracking-[0.3em] text-ducks-green">
                                Trending Now
                            </p>
                            <h2 className="text-3xl font-display font-bold text-white mt-2">
                                Start with a proven composition
                            </h2>
                            <p className="text-sm text-white/50 mt-2 max-w-xl">
                                Load a curated example and refine it. Or start fresh with a blank canvas.
                            </p>
                        </div>
                        <Button
                            onClick={handleStartFromScratch}
                            className="h-12 px-6 text-sm font-black tracking-wider bg-white text-black hover:bg-ducks-yellow"
                            disabled={isLoadingExample}
                            aria-label="Start a new design from scratch"
                        >
                            Start from Scratch
                        </Button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {TRENDING_EXAMPLES.map((example) => (
                            <button
                                key={example.id}
                                onClick={() => handleLoadExample(example)}
                                className="group text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all overflow-hidden focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ducks-yellow"
                                disabled={isLoadingExample}
                            >
                                <div className="relative h-36 overflow-hidden">
                                    <img
                                        src={example.layers[0]?.imageUrl}
                                        alt={example.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                                    <span className="absolute bottom-3 left-3 text-xs font-mono uppercase tracking-widest text-white/70">
                                        {example.bodyPart}
                                    </span>
                                </div>
                                <div className="p-4 space-y-2">
                                    <h3 className="text-lg font-bold text-white">{example.title}</h3>
                                    <p className="text-xs text-white/60">{example.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                    {/* Left Sidebar - Body Part Selector */}
                    <div className="xl:col-span-2">
                        <div className="glass-panel rounded-2xl p-4 border border-white/10 sticky top-24">
                            <BodyPartSelector
                                selectedBodyPart={bodyPart}
                                onSelect={handleBodyPartChange}
                                disabled={false}
                            />
                        </div>
                    </div>

                    {/* Center - Canvas */}
                    <div className="xl:col-span-6">
                        <div className="space-y-6">
                            {/* Canvas */}
                            <div className="glass-panel rounded-3xl p-6 border border-white/10">
                                <div className="relative group">
                                    <ForgeCanvas
                                        bodyPart={bodyPart}
                                        layers={sortedLayers}
                                        selectedLayerId={selectedLayerId}
                                        onSelectLayer={selectLayer}
                                        onUpdateTransform={updateTransform}
                                    />

                                    {stencilView && stencilPreview && (
                                        <img
                                            src={stencilPreview}
                                            alt="Stencil preview"
                                            className="absolute inset-0 w-full h-full object-contain mix-blend-screen pointer-events-none"
                                        />
                                    )}

                                    {/* Transform Controls Toolbar */}
                                    {selectedLayerId && (
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2">
                                            <TransformControls
                                                onFlipHorizontal={() => flipHorizontal(selectedLayerId)}
                                                onFlipVertical={() => flipVertical(selectedLayerId)}
                                                onResetRotation={() => updateTransform(selectedLayerId, { rotation: 0 })}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <Button
                                        onClick={handleToggleStencil}
                                        className="h-10 px-4 text-xs font-black tracking-wider bg-white text-black hover:bg-ducks-yellow"
                                        disabled={isStencilProcessing}
                                        aria-label="Toggle stencil view"
                                    >
                                        {stencilView ? 'Exit Stencil View' : 'Stencil View'}
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            if (!stencilSourceUrl) {
                                                await createStencilSource();
                                            }
                                            setShowStencilExport(true);
                                        }}
                                        className="h-10 px-4 text-xs font-black tracking-wider bg-black/40 text-white hover:bg-black/60"
                                        aria-label="Export stencil"
                                    >
                                        Export Stencil
                                    </Button>
                                    {isStencilProcessing && (
                                        <span className="text-xs text-white/60 font-mono">Generating stencil...</span>
                                    )}
                                    {stencilError && (
                                        <span className="text-xs text-red-400">{stencilError}</span>
                                    )}
                                </div>

                                {selectedLayer && (
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-xs font-mono uppercase tracking-[0.3em] text-ducks-green">
                                                Layer Blend
                                            </p>
                                            <p className="text-sm text-white/70 mt-2">
                                                {selectedLayer.name}
                                            </p>
                                            <div className="mt-3">
                                                <BlendModeSelector
                                                    value={selectedLayer.blendMode}
                                                    onChange={(value) => handleBlendModeChange(selectedLayer.id, value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                                            <p className="text-xs font-mono uppercase tracking-[0.3em] text-ducks-green">
                                                Layer Actions
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    onClick={() => setShowInpainting(true)}
                                                    className="h-11 text-xs font-black tracking-wider bg-white text-black hover:bg-ducks-yellow"
                                                    icon={Wand2}
                                                >
                                                    Inpaint
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setRestyleLayerId(selectedLayer.id);
                                                        setRestyleStyle(matchStyle);
                                                    }}
                                                    className="h-11 text-xs font-black tracking-wider bg-black/40 text-white hover:bg-black/60"
                                                    icon={Sparkles}
                                                >
                                                    Restyle
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    onClick={handleExportPNG}
                                                    className="h-11 text-xs font-black tracking-wider bg-black/40 text-white hover:bg-black/60"
                                                    icon={Download}
                                                >
                                                    Export PNG
                                                </Button>
                                                <Button
                                                    onClick={handleExportARAsset}
                                                    className="h-11 text-xs font-black tracking-wider bg-black/40 text-white hover:bg-black/60"
                                                    icon={Download}
                                                >
                                                    AR Asset
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Prompt Interface */}
                            <div className="glass-panel rounded-3xl p-8 border border-white/10">
                                <PromptInterface
                                    value={promptText}
                                    onChange={setPromptText}
                                    onEnhance={handleEnhance}
                                    isEnhancing={isEnhancing}
                                    selectedChips={selectedChips}
                                    onChipSelect={handleChipSelect}
                                />

                                <VibeChips
                                    suggestions={suggestions}
                                    selectedChips={selectedChips}
                                    onChipSelect={handleChipSelect}
                                    isLoading={isSuggestionsLoading}
                                />

                                <AdvancedOptions
                                    isExpanded={showAdvanced}
                                    onToggle={() => setShowAdvanced(!showAdvanced)}
                                    size={size}
                                    onSizeChange={setSize}
                                    aiModel={aiModel}
                                    onModelChange={setAiModel}
                                    negativePrompt={negativePrompt}
                                    onNegativePromptChange={setNegativePrompt}
                                    enhancementLevel={enhancementLevel}
                                    onEnhancementLevelChange={setEnhancementLevel}
                                />

                                {enhancedPrompt && (
                                    <div className="mt-6 p-6 bg-purple-500/10 border border-purple-500/30 rounded-2xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider">
                                                ✨ AI Enhanced Prompt ({enhancementLevel})
                                            </h4>
                                            <button
                                                onClick={() => setEnhancedPrompt(null)}
                                                className="text-xs text-gray-500 hover:text-white transition-colors"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            {enhancedPrompt}
                                        </p>
                                    </div>
                                )}

                                {(enhancedPrompt || promptText.trim()) && (
                                    <div className="mt-6">
                                        <Button
                                            onClick={handleGenerate}
                                            className="w-full h-20 text-xl font-black tracking-wider bg-ducks-yellow text-black hover:bg-white shadow-2xl"
                                            icon={Zap}
                                        >
                                            GENERATE DESIGN
                                        </Button>
                                        {isGenerating && (
                                            <div className="mt-4 space-y-2">
                                                <div className="flex items-center justify-between text-xs text-white/60 font-mono">
                                                    <span>Rendering high-res...</span>
                                                    <span>
                                                        {progress?.etaSeconds !== null ? `~${progress.etaSeconds}s` : 'estimating...'}
                                                    </span>
                                                </div>
                                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                                    <div
                                                        className="h-full bg-ducks-green transition-all"
                                                        style={{ width: `${Math.round((progress?.percent || 0) * 100)}%` }}
                                                    />
                                                </div>
                                                {queueLength > 0 && (
                                                    <div className="text-[10px] text-white/40 font-mono">
                                                        Queue: {queueLength} request{queueLength > 1 ? 's' : ''} waiting
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {generationError && (
                                            <div className="mt-4 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-xs text-red-200 flex items-center justify-between gap-3">
                                                <span>{generationError}</span>
                                                <button
                                                    onClick={handleGenerate}
                                                    className="px-3 py-1 rounded-full bg-red-500/30 text-red-100 text-[10px] font-mono uppercase tracking-wider"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <VersionTimeline
                                versions={timeline}
                                currentVersionId={currentVersionId}
                                onLoadVersion={handleLoadVersion}
                                onBranchVersion={handleBranchVersion}
                                onCompareVersions={handleCompareVersions}
                                onDeleteVersion={removeVersion}
                            />
                        </div>
                    </div>

                    {/* Right Sidebar - Match Pulse + Layer Stack */}
                    <div className="xl:col-span-4">
                        <div className="sticky top-24 space-y-6">
                            <MatchPulseSidebar
                                matches={matches}
                                totalMatches={totalMatches}
                                isLoading={isMatching}
                                error={matchError}
                                context={matchContext}
                            />
                            <div className="glass-panel rounded-2xl border border-white/10 h-[360px] md:h-[calc(100vh-28rem)]">
                                <LayerStack
                                    layers={layers}
                                    selectedLayerId={selectedLayerId}
                                    onSelectLayer={selectLayer}
                                    onToggleVisibility={toggleVisibility}
                                    onRename={rename}
                                    onDelete={deleteLayer}
                                    onReorder={reorder}
                                    onAddLayer={() => {
                                        // Demo: Add a placeholder layer
                                        const demoUrl = `https://via.placeholder.com/400x600/${Math.random() > 0.5 ? '154733' : 'FEE123'}/000000?text=Layer+${layers.length + 1}`;
                                        addLayer(demoUrl, layers.length % 3 === 0 ? 'background' : 'subject');
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning Modal */}
            <BodyPartWarningModal
                isOpen={showWarning}
                currentBodyPart={bodyPart}
                newBodyPart={pendingBodyPart || DEFAULT_BODY_PART}
                onCancel={handleCancelBodyPartChange}
                onConfirm={handleConfirmBodyPartChange}
            />

            {showStencilExport && stencilSourceUrl && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                Stencil Export
                            </h3>
                            <button
                                onClick={() => setShowStencilExport(false)}
                                className="text-white/60 hover:text-white text-sm"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-6">
                            <StencilExport imageUrl={stencilSourceUrl} designName={promptText || 'tattoo'} />
                        </div>
                    </div>
                </div>
            )}

            {showInpainting && selectedLayer?.imageUrl && (
                <InpaintingEditor
                    imageUrl={selectedLayer.imageUrl}
                    onClose={() => setShowInpainting(false)}
                    onSave={handleInpaintSave}
                />
            )}

            {restyleLayerId && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 rounded-2xl max-w-lg w-full">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                Restyle Layer
                            </h3>
                            <button
                                onClick={() => {
                                    setRestyleLayerId(null);
                                    setRestyleStyle('');
                                }}
                                className="text-white/60 hover:text-white text-sm"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="restyle-style" className="text-xs font-mono uppercase tracking-wider text-white/60">
                                    New Style
                                </label>
                                <input
                                    id="restyle-style"
                                    type="text"
                                    value={restyleStyle}
                                    onChange={(e) => setRestyleStyle(e.target.value)}
                                    placeholder="e.g., Fine-line, Blackwork, Neo-traditional"
                                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ducks-green/60"
                                />
                                <p className="mt-2 text-xs text-white/50">
                                    We'll regenerate the selected layer using the new style while keeping your core prompt.
                                </p>
                            </div>
                            <Button
                                onClick={handleRestyle}
                                disabled={!restyleStyle.trim() || isGenerating}
                                className="w-full h-12 text-sm font-black tracking-wider bg-ducks-yellow text-black hover:bg-white disabled:opacity-60"
                                icon={Sparkles}
                            >
                                Apply Restyle
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {comparison && (
                <VersionComparison
                    versionA={comparison.versionA}
                    versionB={comparison.versionB}
                    onClose={() => setComparison(null)}
                    onRestoreA={(version) => handleLoadVersion(version.id)}
                    onRestoreB={(version) => handleLoadVersion(version.id)}
                />
            )}

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal
                isOpen={keyboardShortcuts.isOpen}
                onClose={keyboardShortcuts.close}
            />

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
}

// Wrap the entire component in ErrorBoundary for robustness
export function GenerateWithErrorBoundary(props) {
    return (
        <ErrorBoundary>
            <Generate {...props} />
        </ErrorBoundary>
    );
}
