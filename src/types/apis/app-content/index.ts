export type GroupItem = {
  id: string
  mainTitle: string
  subTitle?: string
  imageUrl: string
  tested?: boolean
  topic?: string | null
  type?: 'Speaking_Part_1' | 'Speaking_Part_2' | 'Speaking_Part_3' | 'Speaking_Full_Test'
  is_locked?: boolean
}

export type SectionGroup = {
  groupTitle?: string
  display: 'Horizontal'
  size: 'Big' | 'Small'
  items: GroupItem[]
  seeAll?: boolean
  part: number | null
}

type ContentSection = {
  type: string
  sectionTitle: string
  groups?: SectionGroup[]
}

export type MainScreenContent = ContentSection[]

export type Country = {
  name: string
  code: string
}

export type Province = {
  name: string
  code?: string
}

export type SeeAllContent = {
  type: 'SeeAll_Parts' | 'SeeAll_Tests'
  meta: {
    total: number
    totalPages: number
    pageSize: number
    page: number
  }
  data: GroupItem[]
}
