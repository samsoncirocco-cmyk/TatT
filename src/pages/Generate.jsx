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
import CleanupTool from '../components/generate/CleanupTool';
import VersionTimeline from '../components/generate/VersionTimeline';
import VersionComparison from '../components/generate/VersionComparison';
import LayerContextMenu from '../components/generate/LayerContextMenu';
import RegenerateElementModal from '../components/generate/RegenerateElementModal';
import { ToastContainer } from '../components/ui/Toast';
import { DEFAULT_BODY_PART } from '../constants/bodyPartAspectRatios';
import { enhancePrompt } from '../services/councilService';
import useVibeChipSuggestions from '../hooks/useVibeChipSuggestions';
import { useLayerManagement } from '../hooks/useLayerManagement';
import { useArtistMatching } from '../hooks/useArtistMatching';
import { useCanvasAspectRatio } from '../hooks/useCanvasAspectRatio';
import { useVersionHistory } from '../hooks/useVersionHistory';
import { useSmartPreview } from '../hooks/useSmartPreview';
import { useToast } from '../hooks/useToast';
import { useStorageWarning } from '../hooks/useStorageWarning';
import * as versionService from '../services/versionService';
import Button from '../components/ui/Button';
import { Wand2, Zap, Download, Sparkles, Layers, CheckCircle, Plus, Eraser } from 'lucide-react';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { normalizeStyleKey } from '../config/promptTemplates';
import TransformControls from '../components/generate/TransformControls';
import { exportAsPNG, exportAsARAsset } from '../services/canvasService';
import { convertToStencil } from '../services/stencilService';
import {
    processGenerationResult,
    addMultipleLayers,
    shouldUseMultiLayer
} from '../services/multiLayerService';

const TRENDING_EXAMPLES = [
    {
        id: 'cyberpunk-gohan',
        title: 'Cyberpunk Gohan',
        description: 'Neon energy, bold anime contrasts',
        bodyPart: 'forearm',
        prompt: 'Cyberpunk Gohan in a neon rainstorm with electric aura',
        layers: [
            {
                imageUrl: '/images/trending/cyberpunk-gohan-bg.svg',
                type: 'background'
            },
            {
                imageUrl: '/images/trending/cyberpunk-gohan-subject.svg',
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
                imageUrl: '/images/trending/fine-line-peonies-subject.svg',
                type: 'subject'
            },
            {
                imageUrl: '/images/trending/fine-line-peonies-bg.svg',
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
                imageUrl: '/images/trending/dragon-storm-subject.svg',
                type: 'subject'
            },
            {
                imageUrl: '/images/trending/dragon-storm-bg.svg',
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
                imageUrl: '/images/trending/neo-trad-owl-subject.svg',
                type: 'subject'
            },
            {
                imageUrl: '/images/trending/neo-trad-owl-bg.svg',
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
                imageUrl: '/images/trending/blackwork-serpent-subject.svg',
                type: 'subject'
            },
            {
                imageUrl: '/images/trending/blackwork-serpent-bg.svg',
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
                imageUrl: '/images/trending/japanese-crane-subject.svg',
                type: 'subject'
            },
            {
                imageUrl: '/images/trending/japanese-crane-bg.svg',
                type: 'background'
            }
        ]
    },
    {
        id: 'phoenix-crest',
        title: 'Phoenix Crest',
        description: 'Rising flame silhouette',
        bodyPart: 'calf',
        prompt: 'Phoenix crest with ember trails and clean contours',
        layers: [
            {
                imageUrl: '/images/trending/phoenix-crest-subject.svg',
                type: 'subject'
            },
            {
                imageUrl: '/images/trending/phoenix-crest-bg.svg',
                type: 'background'
            }
        ]
    },
    {
        id: 'ornamental-crown',
        title: 'Ornamental Crown',
        description: 'Symmetry with filigree accents',
        bodyPart: 'sternum',
        prompt: 'Ornamental crown with filigree and gemstone inlays',
        layers: [
            {
                imageUrl: '/images/trending/ornamental-crown-subject.svg',
                type: 'subject'
            },
            {
                imageUrl: '/images/trending/ornamental-crown-bg.svg',
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
    const [separateRGBA, setSeparateRGBA] = useState(false);

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
    const normalizedStyle = normalizeStyleKey(resolvedStyle) || 'traditional';

    const generationInput = useMemo(() => ({
        subject: enhancedPrompt || promptText,
        style: normalizedStyle,
        bodyPart,
        size,
        aiModel,
        negativePrompt
    }), [enhancedPrompt, promptText, normalizedStyle, bodyPart, size, aiModel, negativePrompt]);

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
        userInput: generationInput
    });

    const {
        preview,
        isPreviewing,
        error: previewError
    } = useSmartPreview({
        userInput: generationInput,
        enabled: Boolean((enhancedPrompt || promptText).trim()),
        debounceMs: 300
    });

    // UI state
    const [isLoadingExample, setIsLoadingExample] = useState(false);
    const [showInpainting, setShowInpainting] = useState(false);
    const [showCleanup, setShowCleanup] = useState(false);
    const [restyleLayerId, setRestyleLayerId] = useState(null);
    const [restyleStyle, setRestyleStyle] = useState('');
    const [comparison, setComparison] = useState(null);
    const [showElementModal, setShowElementModal] = useState(false);
    const [elementPrompt, setElementPrompt] = useState('');
    const [elementType, setElementType] = useState('subject');
    const [contextMenu, setContextMenu] = useState(null);
    const [regenerateModal, setRegenerateModal] = useState(null);

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

    const previewImage = preview?.images?.[0] || null;
    const showPreview = Boolean(previewImage && layers.length === 0);

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
                style: matchStyle,
                generationMode: overrides.mode || null,
                dpi: overrides.dpi || 300
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

    const handleGenerate = async (finalize = false) => {
        if (!promptText.trim() && !enhancedPrompt?.trim()) return;

        try {
            const result = await generateHighRes({ finalize });

            if (result && result.images && result.images.length > 0) {
                let createdLayers = [];

                // Check if we should use multi-layer processing
                if (shouldUseMultiLayer(result)) {
                    console.log('[Generate] Using multi-layer processing for', result.images.length, 'images');

                    // Process generation result into layer specifications
                    const layerSpecs = await processGenerationResult(result, {
                        separateAlpha: separateRGBA,  // Use user preference
                        autoDetectAlpha: true         // Always detect alpha channel
                    });

                    // Add all layers to canvas
                    createdLayers = await addMultipleLayers(layerSpecs, addLayer);

                    // Use the last layer's image as the version thumbnail
                    const thumbnailUrl = createdLayers[createdLayers.length - 1]?.imageUrl || result.images[0];
                    const nextLayers = [...layers, ...createdLayers];

                    addVersion(buildVersionPayload({
                        layers: nextLayers,
                        imageUrl: thumbnailUrl,
                        arAssetUrl: arAsset?.url || null,
                        mode: finalize ? 'final' : 'refine'
                    }));

                    console.log(`[Generate] Created ${createdLayers.length} layers from ${result.images.length} images`);
                } else {
                    // Single image - use legacy flow
                    console.log('[Generate] Using single-layer flow');
                    const newLayer = await addLayer(result.images[0], 'subject');
                    const nextLayers = [...layers, newLayer];
                    addVersion(buildVersionPayload({
                        layers: nextLayers,
                        imageUrl: newLayer.imageUrl,
                        arAssetUrl: arAsset?.url || null,
                        mode: finalize ? 'final' : 'refine'
                    }));
                }

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

    const handleMergeVersions = (versionA, versionB) => {
        // Get layer indices for all layers from both versions
        const layersFromVersion1 = (versionA.layers || []).map((_, idx) => idx);
        const layersFromVersion2 = (versionB.layers || []).map((_, idx) => idx);

        // Merge versions
        const merged = versionService.mergeVersions(sessionId, versionA.id, versionB.id, {
            layersFromVersion1,
            layersFromVersion2,
            prompt: versionA.prompt || promptText,
            parameters: versionA.parameters || { bodyPart, size, aiModel }
        });

        if (merged) {
            // Load the merged version
            replaceLayers(merged.layers || []);
            setComparison(null); // Close comparison modal
            toast?.success?.(`Merged v${versionA.versionNumber} and v${versionB.versionNumber} into new version`);
        }
    };

    const handleRestyle = async () => {
        if (!restyleLayerId || !restyleStyle.trim()) return;

        const promptBase = enhancedPrompt || promptText;
        const restylePrompt = [promptBase, restyleStyle].filter(Boolean).join(', ');

        try {
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

            if (response?.images?.length > 0) {
                // For restyle, always use the first image to replace the target layer
                // Multi-layer output from restyle would be confusing UX
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
        } catch (error) {
            console.error('[Generate] Restyle failed:', error);
        } finally {
            setRestyleLayerId(null);
            setRestyleStyle('');
        }
    };

    const handleAddElement = async () => {
        if (!elementPrompt.trim()) return;

        try {
            const response = await generateHighRes({
                userInputOverride: {
                    subject: elementPrompt,
                    style: normalizedStyle,
                    bodyPart,
                    size,
                    aiModel,
                    negativePrompt
                }
            });

            if (response?.images?.length > 0) {
                let createdLayers = [];

                // Check if multi-layer processing is needed
                if (shouldUseMultiLayer(response)) {
                    console.log('[Generate] Adding element with multi-layer processing');

                    // Process into layer specs, but override all types to match user selection
                    const layerSpecs = await processGenerationResult(response, {
                        separateAlpha: separateRGBA,
                        autoDetectAlpha: true
                    });

                    // Override layer types with user-selected element type
                    layerSpecs.forEach(spec => {
                        spec.type = elementType;
                    });

                    createdLayers = await addMultipleLayers(layerSpecs, addLayer);
                } else {
                    // Single layer
                    const newLayer = await addLayer(response.images[0], elementType);
                    createdLayers = [newLayer];
                }

                const nextLayers = [...layers, ...createdLayers];
                addVersion(buildVersionPayload({
                    layers: nextLayers,
                    imageUrl: createdLayers[createdLayers.length - 1]?.imageUrl || response.images[0],
                    mode: 'element'
                }));
            }
        } catch (error) {
            console.error('[Generate] Add element failed:', error);
        } finally {
            setShowElementModal(false);
            setElementPrompt('');
            setElementType('subject');
        }
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

    const handleCleanupSave = (imageUrl) => {
        if (!selectedLayerId || !imageUrl) return;
        updateImage(selectedLayerId, imageUrl);
        const nextLayers = layers.map(layer =>
            layer.id === selectedLayerId ? { ...layer, imageUrl } : layer
        );
        addVersion(buildVersionPayload({
            layers: nextLayers,
            imageUrl,
            mode: 'cleanup'
        }));
        setShowCleanup(false);
        toast?.success?.('Layer cleaned up successfully');
    };

    // Context menu handlers
    const handleLayerContextMenu = (layer, x, y) => {
        setContextMenu({ layer, x, y });
    };

    const handleDuplicateLayer = async (layer) => {
        const newLayer = await addLayer(layer.imageUrl, layer.type);
        const nextLayers = [...layers, newLayer];
        addVersion(buildVersionPayload({
            layers: nextLayers,
            imageUrl: newLayer.imageUrl
        }));
        toast?.success?.(`Duplicated layer: ${layer.name}`);
    };

    const handleRegenerateElementSubmit = async (data) => {
        try {
            const response = await generateHighRes({
                userInputOverride: {
                    subject: data.prompt,
                    style: data.useOriginalStyle ? normalizedStyle : 'default',
                    bodyPart,
                    size,
                    aiModel,
                    negativePrompt
                }
            });

            if (response?.images?.[0]) {
                updateImage(data.layerId, response.images[0]);
                const nextLayers = layers.map(layer =>
                    layer.id === data.layerId ? { ...layer, imageUrl: response.images[0] } : layer
                );
                addVersion(buildVersionPayload({
                    layers: nextLayers,
                    imageUrl: response.images[0],
                    mode: 'regenerate'
                }));

                setRegenerateModal(null);
                toast?.success?.('Element regenerated successfully');
            }
        } catch (error) {
            console.error('[Generate] Regenerate failed:', error);
            toast?.error?.('Failed to regenerate element');
        }
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

                                    {showPreview && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <img
                                                src={previewImage}
                                                alt="Preview"
                                                className="w-full h-full object-contain opacity-80"
                                            />
                                            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 text-xs font-mono uppercase tracking-widest text-ducks-yellow">
                                                Preview
                                            </div>
                                        </div>
                                    )}

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
                                    {isPreviewing && (
                                        <span className="text-xs text-white/50 font-mono">
                                            Updating preview...
                                        </span>
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
                                                    onClick={() => setShowCleanup(true)}
                                                    className="h-11 text-xs font-black tracking-wider bg-ducks-yellow text-black hover:bg-white"
                                                    icon={Eraser}
                                                >
                                                    Clean Up
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
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
                                                <Button
                                                    onClick={handleExportPNG}
                                                    className="h-11 text-xs font-black tracking-wider bg-black/40 text-white hover:bg-black/60"
                                                    icon={Download}
                                                >
                                                    Export PNG
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
                                    separateRGBA={separateRGBA}
                                    onSeparateRGBAChange={setSeparateRGBA}
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
                                    <div className="mt-6 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                onClick={() => handleGenerate(false)}
                                                disabled={isGenerating}
                                                className="h-16 text-base font-black tracking-wider bg-white/10 text-white hover:bg-white/20 border border-white/20"
                                                icon={Layers}
                                            >
                                                REFINE
                                            </Button>
                                            <Button
                                                onClick={() => handleGenerate(true)}
                                                disabled={isGenerating}
                                                className="h-16 text-base font-black tracking-wider bg-ducks-yellow text-black hover:bg-white shadow-2xl"
                                                icon={CheckCircle}
                                            >
                                                FINALIZE
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-white/40 font-mono text-center">
                                            Refine: Quick iteration (50 steps) • Finalize: Max quality (60+ steps, 300 DPI)
                                        </p>
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
                                                    onClick={() => handleGenerate(false)}
                                                    className="px-3 py-1 rounded-full bg-red-500/30 text-red-100 text-[10px] font-mono uppercase tracking-wider"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        )}
                                        {previewError && (
                                            <div className="mt-4 text-[10px] text-red-300 font-mono text-center">
                                                Preview failed. Adjust your prompt and try again.
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
                                    onContextMenu={handleLayerContextMenu}
                                    onAddLayer={() => {
                                        setShowElementModal(true);
                                        setElementPrompt('');
                                        setElementType('subject');
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

            {showCleanup && selectedLayer?.imageUrl && (
                <CleanupTool
                    imageUrl={selectedLayer.imageUrl}
                    onClose={() => setShowCleanup(false)}
                    onSave={handleCleanupSave}
                />
            )}

            {showElementModal && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="glass-panel border border-white/10 rounded-2xl max-w-lg w-full">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                Add New Element
                            </h3>
                            <button
                                onClick={() => setShowElementModal(false)}
                                className="text-white/60 hover:text-white text-sm"
                                aria-label="Close add element modal"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="element-prompt" className="text-xs font-mono uppercase tracking-wider text-white/60">
                                    Element Prompt
                                </label>
                                <textarea
                                    id="element-prompt"
                                    value={elementPrompt}
                                    onChange={(e) => setElementPrompt(e.target.value)}
                                    placeholder="e.g., Add a koi fish, lightning bolt, ornamental frame"
                                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ducks-green/60"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label htmlFor="element-type" className="text-xs font-mono uppercase tracking-wider text-white/60">
                                    Element Type
                                </label>
                                <select
                                    id="element-type"
                                    value={elementType}
                                    onChange={(e) => setElementType(e.target.value)}
                                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ducks-green/60"
                                >
                                    <option value="subject">Subject</option>
                                    <option value="background">Background</option>
                                    <option value="effect">Effect</option>
                                </select>
                            </div>
                            <Button
                                onClick={handleAddElement}
                                disabled={!elementPrompt.trim() || isGenerating}
                                className="w-full h-12 text-sm font-black tracking-wider bg-ducks-yellow text-black hover:bg-white disabled:opacity-60"
                                icon={Plus}
                            >
                                Generate Element
                            </Button>
                        </div>
                    </div>
                </div>
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
                    onMerge={handleMergeVersions}
                />
            )}

            {/* Layer Context Menu */}
            {contextMenu && (
                <LayerContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    layer={contextMenu.layer}
                    onClose={() => setContextMenu(null)}
                    onRegenerate={(layer) => {
                        setRegenerateModal(layer);
                        setContextMenu(null);
                    }}
                    onDuplicate={handleDuplicateLayer}
                    onDelete={(layer) => {
                        deleteLayer(layer.id);
                        setContextMenu(null);
                    }}
                    onToggleVisibility={(layer) => {
                        toggleVisibility(layer.id);
                    }}
                    onInpaint={(layer) => {
                        selectLayer(layer.id);
                        setShowInpainting(true);
                        setContextMenu(null);
                    }}
                    onCleanup={(layer) => {
                        selectLayer(layer.id);
                        setShowCleanup(true);
                        setContextMenu(null);
                    }}
                />
            )}

            {/* Regenerate Element Modal */}
            {regenerateModal && (
                <RegenerateElementModal
                    layer={regenerateModal}
                    onClose={() => setRegenerateModal(null)}
                    onRegenerate={handleRegenerateElementSubmit}
                    isGenerating={isGenerating}
                    error={generationError}
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
