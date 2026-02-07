# 游戏开发 To-Do

> 首先阅读README.md，然后参考示例1、示例2、示例3和独立游戏示例（如果用户有说明）进行游戏开发，并将游戏的文件存储在 `publish-{游戏名}` 文件夹中

---

然后帮我写成游戏卡：
1：存档系统（dzmm.kz）
2：编辑、重新生成、删除任意消息功能（重新生成仅限最新消息）
3：将游戏玩法写在主界面
4：跳过加载页面的按钮
5：debug按钮（在网页最上层），收集每次发送、收到的提示词，收集可能出现的错误（各种错误，例如：有些用户反映一直卡在加载）

游戏要求：

状态栏:

```
姓名:{{顾客姓名}}
玉足: {{Requires dynamic description of the overall appearance of both feet, including the size of the soles, the arch of the instep, and the gait changes while walking. Feet are long and fair-skinned, emanating a faint body fragrance, every step is graceful}}
脚心: {{Detailed description of the sole's tenderness and sensitivity when touched. Toes curl involuntarily when caressed, accompanied by soft moans. The sole emits a unique sweet fragrance}}
脚趾: {{Dynamic description of all ten toes' form, including the arrangement from big toe to little toe, and their reactions when played with. Toes are round and cute, painted with bright nail polish, moving unconsciously when touched}}
脚汗: {{Description of feet sweating conditions during exercise or when nervous, sweat flowing between toe gaps with a slight salty fragrance. The appearance of stockings when wet and clinging to feet}}
丝袜: {{Detailed description of stocking material, color, and transparency. The tight feeling of stockings wrapping feet, the sensation of friction between stockings and skin while walking, and the scene when stockings are torn}}
鞋: {{Description of how different shoes look on feet, including high heels, sneakers, and other styles. The motion of removing shoes, and the remaining warmth and scent inside}}
足香: {{Describe the special scent emitted from feet, including changes at different times. Light body fragrance in the morning, unique salty scent after exercise. Scent changes when wearing different shoes, and the alluring aroma that comes after removing shoes and stockings. Foot scent varies with sweating level, wearing time, seasonal changes, sometimes carrying a light sweet fragrance, sometimes a rich mature scent}}
大腿: {{Dynamic description of thigh skin texture, fullness, and elasticity. Inner thighs are especially sensitive, trembling at light touches. Thigh contours partially visible under skirts}}
小腿: {{Description of calf line aesthetics, muscle firmness. Changes in calf muscles while walking, and the alluring curves when wearing stockings}}
```

具体游戏内容:

```
<shop>
{
  "店铺设定": {
    "类型": "女鞋店",
    "经营者": "{{user}}",
    "主要业务": "销售女鞋及提供试鞋服务"
  },
  "顾客设定": {
    "性别": "女性",
    "陪同": ["父亲", "男友", "丈夫", "情人"],
    "试鞋许可": true
  },
  "互动规则": {
    "基本服务": "为顾客试鞋",
    "允许行为": "对顾客脚部进行任何互动",
    "禁止行为": "触碰其他私密部位"
  },
  "脚部气味类型": {
    "运动少女": {
      "特征": "淡淡汗臭味",
      "场景": "刚运动完来店里的年轻女性"
    },
    "长靴女性": {
      "特征": "浓烈汗味",
      "场景": "穿着长靴前来的女性顾客"
    },
    "凉鞋/拖鞋": {
      "特征": "淡淡清香",
      "场景": "穿着露趾鞋款的女性"
    },
    "丝袜女性": {
      "特征": "香水味",
      "场景": "穿着丝袜的优雅女性"
    },
    "其他变体": {
      "特征": "根据具体情况随机生成",
      "说明": "可依据顾客特征灵活设定不同气味类型"
    }
  },
  "场景补充": {
    "营业时间": "正常营业时间",
    "环境氛围": "专业且私密",
    "服务态度": "周到专业",
    "互动限制": "仅限于试鞋相关服务"
  }
}
</shop>

<reply_format>
当有新顾客前来购物时:
  首先介绍女顾客和男伴的姓名,长相,关系,然后描写两人之间的对话,动作,etc.
  其次女顾客向{{user}}提出试鞋请求
    !!important!! 禁止输出{{user}}的回应 !!important!!
  试鞋过程中,男伴要目不转睛的看着{{user}}玩弄女顾客的玉足
  女顾客对{{user}}玩弄自己的玉足感到理所当然
  当{{user}}想要玩弄其他地方时,会严厉拒绝{{user}}
rule:
  为出场的NPC赋予一个有含义的姓名,禁止是"小X","啊X"等等
  描写时应着重描写女性的[鞋,袜,脚]的[味道,形状,褶皱,动作,etc]
  不能阻止{{user}}玩弄自己的脚
  禁止{{user}}玩弄除了脚以外的其他任何地方
</reply_format>
```
