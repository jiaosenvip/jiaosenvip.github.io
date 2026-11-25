/* AI 术语手册 —— 分类定义与全局数据容器
   说明：全部数据以 <script> 形式加载，不依赖 fetch，
        因此直接双击 index.html（file:// 协议）也能完整运行。 */
(function () {
  window.AI_TERMS = [];

  window.AI_CATEGORIES = [
    {
      id: 'fundamentals',
      no: '01',
      zh: '基础概念',
      en: 'Fundamentals',
      desc: '机器学习与深度学习的地基：从「什么是学习」到「怎么算学会」',
      color: '#4f6bed'
    },
    {
      id: 'architectures',
      no: '02',
      zh: '模型架构',
      en: 'Architectures',
      desc: '从卷积网络到 Transformer，模型是如何被「搭」出来的',
      color: '#8b5cf6'
    },
    {
      id: 'llm',
      no: '03',
      zh: '大语言模型',
      en: 'LLM & GenAI',
      desc: '预训练、提示词、RAG 与智能体，当下最活跃的一片领域',
      color: '#e0557a'
    },
    {
      id: 'training',
      no: '04',
      zh: '训练与工程',
      en: 'Training & Systems',
      desc: '算力、优化器与分布式：让模型真正跑起来的工程细节',
      color: '#0e9f8a'
    },
    {
      id: 'evaluation',
      no: '05',
      zh: '评估与指标',
      en: 'Evaluation',
      desc: '如何判断一个模型到底好不好，以及数字会不会骗人',
      color: '#d98420'
    },
    {
      id: 'applications',
      no: '06',
      zh: '应用领域',
      en: 'Applications',
      desc: '视觉、语音、推荐、具身智能：AI 落地的主要战场',
      color: '#2e8bc0'
    },
    {
      id: 'ethics',
      no: '07',
      zh: '安全与治理',
      en: 'Safety & Ethics',
      desc: '偏见、对齐、隐私与合规：能力越强越绕不开的问题',
      color: '#6b7280'
    }
  ];

  /* 每个数据文件调用此方法追加词条 */
  window.AI_ADD = function (list) {
    for (var i = 0; i < list.length; i++) window.AI_TERMS.push(list[i]);
  };

  /* 概念别名 → 已有词条 id
     说明：related 中出现「值得展开但不必单独建页」的概念时，
           统一重定向到最贴近的词条，保证每条相关链接都能跳转。 */
  window.AI_ALIAS = {
    adapter: 'lora', 'agent-rl': 'rl', ann: 'vector-db',
    'anomaly-detection': 'clustering', api: 'mcp', 'applications-cv': 'cv',
    'asr-metrics': 'asr', attribution: 'xai', 'audio-token': 'asr',
    bertscore: 'bleu', bf16: 'mixed-precision', bpe: 'tokenization',
    c2pa: 'watermark', 'catastrophic-forgetting': 'finetune',
    'causal-mask': 'autoregressive', 'chat-template': 'system-prompt',
    chunking: 'rag', citation: 'rag', 'compute-budget': 'flops',
    'cosine-similarity': 'embedding', 'cross-attention': 'attention', cuda: 'gpu',
    decoding: 'top-p', deployment: 'inference', 'differential-privacy': 'privacy',
    dino: 'contrastive', dit: 'diffusion', 'document-ai': 'ocr',
    'domain-shift': 'generalization', 'double-descent': 'bias-variance',
    ensemble: 'bias-variance', 'error-analysis': 'confusion-matrix',
    factuality: 'hallucination', 'fairness-metrics': 'bias',
    'federated-learning': 'privacy', 'feedback-loop': 'recommender', fid: 'gan',
    'flash-attention': 'self-attention', gnn: 'ai-for-science',
    'goodharts-law': 'reward-hacking', gqa: 'multi-head-attention',
    'gradient-accumulation': 'batch-size', 'gradient-checkpointing': 'checkpoint',
    'gradient-clipping': 'vanishing-gradient', 'gradient-scaling': 'mixed-precision',
    'greedy-decoding': 'top-p', grounding: 'rag', grpo: 'ppo', gru: 'lstm',
    'gui-agent': 'agent', 'hybrid-search': 'vector-db',
    'instruction-data': 'sft', interoperability: 'mcp',
    'kl-divergence': 'ppo', kto: 'dpo', 'label-smoothing': 'cross-entropy',
    'latent-diffusion': 'diffusion', 'llm-as-judge': 'human-evaluation',
    logits: 'softmax', 'lost-in-the-middle': 'context-window', mamba: 'rnn',
    memory: 'agent', merge: 'lora', 'mode-collapse': 'gan',
    'model-compression': 'quantization', 'model-versioning': 'checkpoint',
    'multi-agent': 'agent', ndcg: 'auc', 'needle-in-haystack': 'long-context',
    orpo: 'dpo', 'patch-embedding': 'vit', peft: 'lora', planning: 'agent',
    'policy-gradient': 'ppo', pooling: 'cnn', 'preference-data': 'rlhf',
    prefill: 'inference', prm: 'reward-model', ranking: 'recommender',
    react: 'agent', 'reasoning-model': 'test-time-compute',
    'representation-learning': 'embedding', retrieval: 'rag',
    'retrieval-augmented-icl': 'rag', rmsnorm: 'normalization',
    rope: 'positional-encoding', routing: 'moe', 'safety-critical': 'ai-safety',
    sam: 'segmentation', 'self-consistency': 'cot', seq2seq: 'encoder-decoder',
    sim2real: 'embodied', simulation: 'world-model', 'sparse-model': 'moe',
    'speculative-decoding': 'inference', 'stable-diffusion': 'text-to-image',
    summarization: 'nlp', 'synthetic-data': 'data-curation',
    'teacher-model': 'knowledge-distillation', threshold: 'precision-recall',
    'tool-use': 'function-calling', uncertainty: 'calibration',
    'uncertainty-sampling': 'active-learning', unet: 'segmentation',
    vla: 'embodied', warmup: 'learning-rate', 'weight-decay': 'regularization'
  };
})();
