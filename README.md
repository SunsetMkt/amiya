# Amiya

通过对 antd 的表格、表单、按钮等组件的二次封装，在保留原有功能的情况下，对其进行封装简化使用，用起来更方便。

![阿米娅对比](https://sunflower-assets.oss-cn-hangzhou.aliyuncs.com/images/22.svg)

只需要 30% 左右的代码就可以实现带有增删改查的表格，且比 antd 原本功能更加丰富。

![阿米娅表格](https://sunflower-assets.oss-cn-hangzhou.aliyuncs.com/images/1.png)

![阿米娅表单](https://sunflower-assets.oss-cn-hangzhou.aliyuncs.com/images/2.jpg)

## 📖 文档

文档地址：https://viewweiwu.github.io/amiya/

国内镜像：http://viewweiwu.gitee.io/amiya/

## 🎉 特性

1. 表格“小购物车”，可以跨页批量操作，如跨页批量删除。
2. 表格自带工具栏，可以全屏，刷新，设置别名。
3. 表格顶部查询区域可以根据分辨率改变大小。
4. 表单只带只读模式。
5. 表单只带弹窗模式。
6. 表单可以和表格共享一个配置。
7. 可全局扩展表单项类型，表格列类型。

## 📦 安装

需要提前安装 antd v4。

```bash
npm install amiya -S
```

## 🗝 使用

```tsx
import { AyButton } from 'amiya'

export default function Demo() {
  return <AyButton>amiya</AyButton>
}
```
