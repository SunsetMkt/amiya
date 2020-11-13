import React, {
  ReactNode,
  useImperativeHandle,
  Ref,
  forwardRef,
  useRef,
  MutableRefObject,
  useState,
  useEffect
} from 'react'
import AyCard from '../AyCard'
import { Form, Row, Col } from 'antd'
import { AyFormField, AyFormProps, FieldListener, RegisterFieldProps } from './ay-form'
import { copy } from '../utils'
import { AySearchField } from '../AySearch/ay-search'
import { AnyKeyProps } from '../types/AnyKeyProps'
import { install } from './FieldsInit'
import {
  FORM_TYPE_SELECT,
  FORM_TYPE_PASSWORD,
  FORM_TYPE_INPUT,
  FORM_TYPE_CUSTOM,
  FORM_TYPE_DATE,
  FORM_TYPE_TEXTAREA,
  FORM_TYPE_DATE_RANGE,
  FORM_TYPE_NUMBER,
  FORM_TYPE_PERCENT
} from '../constant'
import './ay-form.less'
import moment from 'moment'
import 'moment/locale/zh-cn'
import { AySearchTableField } from '../AySearchTable/ay-search-table'
import { ColProps } from 'antd/lib/col'

moment.locale('zh-cn')

const defaultLayout = {
  labelCol: { flex: '120px' },
  wrapperCol: { flex: '1' }
}

const fieldMap: AnyKeyProps = {}

/**
 * 注册一个 field type
 * @param fieldType field 类型
 * @param field 注册的 field
 */
export const registerField = (fieldType: string, field: RegisterFieldProps) => {
  fieldMap[fieldType] = field
}

// 初始化注册 field
install(registerField)

/**
 * 获取隐藏配置项
 * @param field 配置项
 */
const getNoVisibleField = (field: AyFormField | AySearchTableField): AyFormField | AySearchTableField => {
  return {
    ...field,
    title: '',
    type: 'empty'
  }
}

/**
 * 生成 placeholder
 * @param field 配置项
 */
const getPlaceholder = (field: AyFormField | AySearchTableField): string => {
  const defaultProps = field.props

  if (defaultProps && defaultProps.placeholder) {
    return defaultProps.placeholder
  }

  if (!field.type) {
    return `请输入${field.title || ''}`
  }

  if (
    [FORM_TYPE_INPUT, FORM_TYPE_NUMBER, FORM_TYPE_PERCENT, FORM_TYPE_PASSWORD, FORM_TYPE_TEXTAREA].includes(field.type)
  ) {
    return `请输入${field.title || ''}`
  } else if ([FORM_TYPE_SELECT, FORM_TYPE_DATE].includes(field.type)) {
    return `请选择${field.title || ''}`
  }

  return field.title || ''
}

/**
 * 获得配置列表
 * @param fields 配置列表
 */
export const getDefaultValue = (fields: Array<AyFormField | AySearchField | AySearchTableField>) => {
  let form: AnyKeyProps = {}
  fields.forEach((field: AyFormField | AySearchField | AySearchTableField) => {
    if (field.type === 'card') {
      form = {
        ...form,
        ...getDefaultValue(field.children || [])
      }
      return
    }
    let type = field.type || 'input'
    const key = field?.key || ''
    // 如果配置项里存在默认值，直接返回默认值，否则从默认值表里获取
    if (field.hasOwnProperty('defaultValue')) {
      // 日期类型的需要通过 moment 转一遍
      if (type === FORM_TYPE_DATE && field.defaultValue) {
        form[key] = moment(field.defaultValue)
      } else {
        form[key] = field.defaultValue
      }
    } else if (type) {
      if (fieldMap[type]) {
        const fieldItem = fieldMap[type]
        let defaultValue = fieldItem.defaultValue
        defaultValue = typeof defaultValue === 'object' ? copy(defaultValue) : defaultValue
        form[key] = defaultValue
      } else {
        form[key] = undefined
      }
    }
  })
  return form
}

export const getFieldDefaultValue = (key: string, fields: Array<AyFormField | AySearchField | AySearchTableField>) => {
  if (!key) {
    return ''
  }
  let field = fields.find((field) => field.key === key)
  if (field) {
    let type = field.type || 'input'
    // 如果配置项里存在默认值，直接返回默认值，否则从默认值表里获取
    if (field.hasOwnProperty('defaultValue')) {
      return field.defaultValue
    } else if (type) {
      if (fieldMap[type]) {
        const fieldItem = fieldMap[type]
        let defaultValue = fieldItem.defaultValue
        defaultValue = typeof defaultValue === 'object' ? copy(defaultValue) : defaultValue
        return defaultValue
      } else {
        return ''
      }
    }
  }
}

/**
 * 根据不同的 type 生成不同种类的标签 Tag
 * @param field 配置项
 */
const getTag = (
  field: AyFormField | AySearchTableField,
  fields: Array<AyFormField | AySearchTableField>,
  formInstans: AnyKeyProps,
  addFieldListener: (key: string, fieldListener: FieldListener) => void,
  removeFiledListener: (key: string, fieldListener: FieldListener) => void,
  readonly?: boolean
) => {
  let { type } = field
  type = type || 'input'
  let tag: ReactNode = null
  if (fieldMap[type || '']) {
    let fieldItem = fieldMap[type || '']
    tag = fieldItem.render({
      field,
      setFieldsValue: formInstans.setFieldsValue,
      formInstans,
      readonly: readonly || field.readonly || false,
      addFieldListener,
      removeFiledListener,
      getFieldValue: formInstans.getFieldValue
    })
  } else {
    switch (type) {
      case FORM_TYPE_CUSTOM:
        if (typeof field.renderContent === 'function') {
          tag = field.renderContent(field, field._values || getDefaultValue(fields))
        }
        break
    }
  }

  return tag
}

/**
 * 通过配置列表转 Form.Item
 * @step 1、判断是否隐藏、保留占位 (visible)
 * @step 2、判断是否隐藏、不保留占位 (hidden)
 * @step 3、计算 Form.Item props 的默认基础属性
 * @step 4、设置特殊标签特殊属性
 * @step 5、设置隐藏占位 (hidden)
 * @step 6、填充 rules 属性
 * @step 7、使用 required 填充 rules
 * @param fields 配置列表
 * @param span Col 占位 0 ～ 24
 */
const getFormItem = (
  fields: Array<AyFormField | AySearchTableField>,
  formInstans: AnyKeyProps,
  addFieldListener: (key: string, fieldListener: FieldListener) => void,
  removeFiledListener: (key: string, fieldListener: FieldListener) => void,
  props: AyFormProps
) => {
  const { span, readonly, formLayout, gutter } = props
  const ayFormProps: AyFormProps = props
  return fields.map((field: AyFormField | AySearchTableField) => {
    if (field.type === 'card') {
      return (
        <Col key={field.key ?? Math.random()} span={24}>
          <AyCard title={field.title} {...field.props}>
            <Row gutter={gutter}>
              {getFormItem(
                field.children as Array<AyFormField | AySearchTableField>,
                formInstans,
                addFieldListener,
                removeFiledListener,
                ayFormProps
              )}
            </Row>
          </AyCard>
        </Col>
      )
    }

    let visible = true

    // 隐藏该项目，保留占位，但是保留值
    if (field.visible !== undefined) {
      visible = typeof field.visible === 'function' ? field.visible() : field.visible
    }

    let hidden = false

    // 隐藏该项目，不保留占位，但是保留值
    if (field.hidden !== undefined) {
      hidden = typeof field.hidden === 'function' ? field.hidden() : field.hidden
    }

    // 隐藏该项，只显示占位，保留 form 值
    if (!visible || hidden) {
      field = getNoVisibleField(field)
    }

    // 设置 Form.Item 的属性
    let props: AnyKeyProps = {
      ...field.formItemProps,
      label: field.title,
      name: field.key,
      extra: field.help
    }

    // 设定 开关、多选框 等的值类型 （这是 ant design form 的限制）
    if (field.type && fieldMap[field.type]) {
      props.valuePropName = fieldMap[field.type].valuePropName || 'value'
    }

    // 设置每个【表单项】的占位
    const colProps: ColProps = {
      span: field.span !== 0 ? field.span || span || 12 : span || 12,
      offset: field.offset
    }

    // 不保留占位
    if (hidden) {
      colProps.span = 0
      colProps.xs = 0
      colProps.sm = 0
      colProps.md = 0
      colProps.lg = 0
      colProps.xl = 0
    }

    // 填充 rules 属性
    if (field.rules) {
      props.rules = [...field.rules]
    }

    // 填充快捷 required 属性
    if (field.required) {
      let rule = { required: true, message: getPlaceholder(field) }
      if (props.rules) {
        props.rules.push(rule)
      } else {
        props.rules = [rule]
      }
    }

    let tag: ReactNode = getTag(field, fields, formInstans, addFieldListener, removeFiledListener, readonly)

    const content = field.render ? (
      field.render(field, field._values || getDefaultValue(fields))
    ) : (
      <Form.Item {...props}>{tag}</Form.Item>
    )

    if (formLayout === 'inline') {
      return content
    }

    return (
      <Col key={field.key} {...colProps}>
        {content}
      </Col>
    )
  })
}

/**
 * 格式化 日期
 * @param values 格式化的数据
 * @param fields 配置项
 */
const formatValues = (values: AnyKeyProps, fields: Array<AyFormField | AySearchTableField>): AnyKeyProps => {
  let result: AnyKeyProps = {}
  for (let key in values) {
    if (key.startsWith('__')) {
      continue
    }
    let value = values[key]
    let field = fields.find((field) => field.key === key)
    if (value && field) {
      if (value.length && field.type === FORM_TYPE_DATE_RANGE) {
        // 区间类型取 startKey 与 endKey
        result[field.startKey || 'startKey'] = value[0].format('YYYY-MM-DD HH:mm:ss')
        result[field.endKey || 'endKey'] = value[0].format('YYYY-MM-DD HH:mm:ss')
      } else if (field.type === FORM_TYPE_DATE) {
        if (field?.props?.showTime === true) {
          result[key] = value.format('YYYY-MM-DD HH:mm:ss')
        } else {
          result[key] = value.format('YYYY-MM-DD')
        }
        // 单值类型直接转
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * 提交表单，如果有 onConfirm 事件传入，则触发一次
 * @param values 表单值
 * @param onConfirm 提交表单事件
 */
const handleConfirm = (
  values: AnyKeyProps,
  fields: Array<AyFormField | AySearchTableField>,
  onConfirm?: (values: AnyKeyProps) => void
) => {
  if (onConfirm) {
    onConfirm(formatValues(values, fields))
  }
}

/**
 * 支持表单改变事件监听
 * @param changedValues 改变的值
 * @param allValues 表单所有的值
 * @param fields 所有的饿配置项
 * @param setFieldsValue 设置表单值的方法
 */
const handleChange = (
  changedValues: AnyKeyProps,
  allValues: AnyKeyProps,
  fields: Array<AyFormField | AySearchTableField>,
  setFieldsValue: (params: AnyKeyProps) => void,
  listnerList: Array<{ key: string; fieldListener: FieldListener }>
) => {
  for (let key in changedValues) {
    let field: AyFormField | AySearchTableField | undefined = fields.find((field) => field.key === key)
    if (field) {
      let value = changedValues[key]
      if (field.onChange) {
        field.onChange(value, allValues, setFieldsValue)
      }
      // 如果监听器里命中目标，则触发目标事件
      listnerList.forEach((item: { key: string; fieldListener: FieldListener }) => {
        if (item.key === key && field) {
          item.fieldListener(value, field)
        }
      })
    }
  }
}

/**
 * antd form 原生支持的方法尽数暴露出去
 */
const funcs = [
  'getFieldValue',
  'getFieldsValue',
  'getFieldError',
  'getFieldsError',
  'isFieldTouched',
  'isFieldsTouched',
  'isFieldValidating',
  'resetFields',
  'scrollToField',
  'setFields',
  'setFieldsValue',
  'submit',
  'validateFields'
]

export default forwardRef(function AyForm(props: AyFormProps, ref: Ref<any>) {
  const {
    fields,
    formLayout = 'horizontal',
    onConfirm,
    children,
    props: defaultProps,
    readonly,
    desc,
    layout,
    className,
    style,
    labelAlign,
    gutter
  } = props

  /** 控制 any form 的实例 */
  const formRef: MutableRefObject<any> = useRef()
  let [listnerList, setListnerList] = useState<Array<any>>([])
  /** 暴露出去的 form 的实例，允许父组件通过 ref 调用方法 */
  const formInstans: AnyKeyProps = {}
  const [inited, setInited] = useState<boolean>(false)
  let [mirrorFields, setMirrorFields] = useState<Array<AyFormField | AySearchTableField>>(fields)
  /** 刷新渲染用 */
  let [refresh, setRefresh] = useState<number>(0)

  /** 填充方法 */
  funcs.forEach((func) => {
    formInstans[func] = (...args: any) => formRef.current[func](...args)
  })

  formInstans.setFieldsValue = (values: AnyKeyProps) => {
    fields.forEach((field) => {
      if (field.type === FORM_TYPE_DATE) {
        if (values[field?.key || '']) {
          values[field?.key || ''] = moment(values[field?.key || ''])
        }
      }
    })
    formRef.current.setFieldsValue(values)
    refresh += 1
    setRefresh(refresh)
  }

  // 改变 field
  formInstans.refreshFields = () => {
    mirrorFields = [...fields]
    setMirrorFields(mirrorFields)
  }

  useEffect(() => {
    setMirrorFields(fields)
  }, [fields])

  /** 覆盖 antd Form getFieldValue 方法 */
  formInstans.getFieldValue = (key: string) => {
    if (inited) {
      let value = formRef.current.getFieldValue(key)
      let field = fields.find((field) => field.key === key)
      if (field && value) {
        if (field.type === FORM_TYPE_DATE) {
          // 日期格式化
          if (field?.props?.showTime === true) {
            value = value.format('YYYY-MM-DD HH:mm:ss')
          } else {
            value = value.format('YYYY-MM-DD')
          }
        } else if (field.type === FORM_TYPE_DATE_RANGE && value.length) {
          // 日期区间格式化
          if (field?.props?.showTime === true) {
            value = [value[0].format('YYYY-MM-DD HH:mm:ss'), value[1].format('YYYY-MM-DD HH:mm:ss')]
          } else {
            value = [value[0].format('YYYY-MM-DD'), value[1].format('YYYY-MM-DD')]
          }
        }
      }
      return value
    } else {
      return getFieldDefaultValue(key, fields)
    }
  }

  /** 暴露方法 */
  useImperativeHandle(ref, () => formInstans)

  const addFieldListener = (key: string, fieldListener: FieldListener) => {
    listnerList.push({
      key,
      fieldListener
    })
    setListnerList(listnerList)
  }

  const removeFiledListener = (key: string, fieldListener: FieldListener) => {
    let index = listnerList.findIndex((item) => item.fieldListener === fieldListener)
    listnerList.splice(index, 1)
    setListnerList(listnerList)
  }

  const formItemLayout =
    formLayout === 'horizontal'
      ? {
          ...defaultLayout,
          ...layout
        }
      : null

  useEffect(() => {
    setInited(true)
  }, [])

  return (
    <div className={`ay-form ${className || ''} ${desc ? 'desc' : ''} ${readonly ? 'readony' : ''}`} style={style}>
      <Form
        ref={formRef}
        {...formItemLayout}
        labelAlign={labelAlign}
        layout={formLayout}
        name={props.name || 'ay-form'}
        initialValues={getDefaultValue(mirrorFields)}
        onFinish={(values) => handleConfirm(values, mirrorFields, onConfirm)}
        onValuesChange={(changedValues, allValues) =>
          handleChange(changedValues, allValues, mirrorFields, formInstans.setFieldsValue, listnerList)
        }
        {...defaultProps}
      >
        <Row gutter={gutter}>
          {getFormItem(mirrorFields, formInstans, addFieldListener, removeFiledListener, props)}
          {children}
        </Row>
      </Form>
    </div>
  )
})
