import { mutation } from './_generated/server'

/** Run once to seed filterDefinitions for each category.
 *  Call via dashboard: api.seedFilters.run */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query('categories').collect()
    const catMap = Object.fromEntries(categories.map((c) => [c.slug, c._id]))

    // Clear existing
    const existing = await ctx.db.query('filterDefinitions').collect()
    for (const f of existing) await ctx.db.delete(f._id)

    const defs: Record<
      string,
      Array<{
        name: string
        slug: string
        type: 'select' | 'multiselect' | 'range' | 'boolean'
        options?: string[]
        unit?: string
      }>
    > = {
      tires: [
        {
          name: 'Բրենդ',
          slug: 'brand',
          type: 'multiselect',
          options: [
            'Michelin',
            'Bridgestone',
            'Continental',
            'Pirelli',
            'Goodyear',
            'Hankook',
            'Yokohama',
            'Dunlop',
            'Toyo',
            'Kumho',
          ],
        },
        {
          name: 'Սեզոն',
          slug: 'season',
          type: 'select',
          options: ['Ամառային', 'Ձմեռային', 'Ամբողջ տարվա'],
        },
        {
          name: 'Լայնություն',
          slug: 'width',
          type: 'select',
          options: [
            '155',
            '165',
            '175',
            '185',
            '195',
            '205',
            '215',
            '225',
            '235',
            '245',
            '255',
            '265',
            '275',
            '285',
            '295',
            '305',
          ],
        },
        {
          name: 'Պրոֆիլ',
          slug: 'profile',
          type: 'select',
          options: ['30', '35', '40', '45', '50', '55', '60', '65', '70', '75', '80'],
        },
        {
          name: 'Ռադիուս',
          slug: 'diameter',
          type: 'select',
          options: ['R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22'],
        },
      ],

      discs: [
        {
          name: 'Բրենդ',
          slug: 'brand',
          type: 'multiselect',
          options: ['BBS', 'OZ Racing', 'Enkei', 'Vossen', 'Rays', 'HRE', 'Rotiform', 'TSW'],
        },
        {
          name: 'Ռադիուս',
          slug: 'diameter',
          type: 'select',
          options: ['R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22'],
        },
        {
          name: 'Լայնություն',
          slug: 'width',
          type: 'select',
          options: ['5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'],
        },
      ],

      oils: [
        {
          name: 'Բրենդ',
          slug: 'brand',
          type: 'multiselect',
          options: [
            'Mobil',
            'Castrol',
            'Shell',
            'Total',
            'Liqui Moly',
            'Motul',
            'Valvoline',
            'Mannol',
            'Elf',
            'Petronas',
          ],
        },
        {
          name: 'Մածուցիկություն',
          slug: 'viscosity',
          type: 'select',
          options: [
            '0W-20',
            '0W-30',
            '0W-40',
            '5W-20',
            '5W-30',
            '5W-40',
            '10W-30',
            '10W-40',
            '15W-40',
            '20W-50',
          ],
        },
        {
          name: 'Յուղի տեսակ',
          slug: 'oilType',
          type: 'select',
          options: ['Սինթետիկ', 'Կիսասինթետիկ', 'Հանքային'],
        },
        {
          name: 'Ծավալ',
          slug: 'volume',
          type: 'select',
          options: ['1L', '4L', '5L', '10L', '20L'],
          unit: 'L',
        },
        {
          name: 'Նշանակություն',
          slug: 'purpose',
          type: 'select',
          options: ['Պրեմիում', 'Էկոնոմ', 'Ամբողջ տարվա'],
        },
      ],

      filters: [
        {
          name: 'Բրենդ',
          slug: 'brand',
          type: 'multiselect',
          options: ['Mann-Filter', 'Bosch', 'Mahle', 'Hengst', 'Filtron', 'K&N', 'WIX', 'Fram', 'Denso'],
        },
        {
          name: 'Ֆիլտրի տեսակ',
          slug: 'filterType',
          type: 'select',
          options: ['Բարձր արդյունավետություն', 'Սպորտային', 'Էկոնոմ', 'Ամբողջ տարվա'],
        },
        {
          name: 'Մեքենայի մակնիշ',
          slug: 'carBrand',
          type: 'select',
          options: [
            'Toyota',
            'BMW',
            'Mercedes',
            'Audi',
            'VW',
            'Hyundai',
            'Kia',
            'Nissan',
            'Honda',
            'Ford',
            'Opel',
            'Mazda',
          ],
        },
      ],

      brakes: [
        {
          name: 'Բրենդ',
          slug: 'brand',
          type: 'multiselect',
          options: ['Brembo', 'ATE', 'TRW', 'Bosch', 'Ferodo', 'EBC', 'Zimmermann', 'Textar'],
        },
        {
          name: 'Արգելակի տեսակ',
          slug: 'brakeType',
          type: 'select',
          options: ['Կալոդկա', 'Դիսկեր'],
        },
        {
          name: 'Առանցք',
          slug: 'axle',
          type: 'select',
          options: ['Առջևի', 'Հետևի'],
        },
        {
          name: 'Մեքենայի մակնիշ',
          slug: 'carBrand',
          type: 'select',
          options: [
            'Toyota',
            'BMW',
            'Mercedes',
            'Audi',
            'VW',
            'Hyundai',
            'Kia',
            'Nissan',
            'Honda',
            'Ford',
            'Opel',
            'Mazda',
          ],
        },
      ],

      lamps: [
        {
          name: 'Բրենդ',
          slug: 'brand',
          type: 'multiselect',
          options: ['Philips', 'Osram', 'Narva', 'Bosch', 'Hella', 'GE'],
        },
        {
          name: 'Տեսակ',
          slug: 'lampType',
          type: 'select',
          options: ['LED', 'Հալոգեն', 'Քսենոն', 'HID'],
        },
        {
          name: 'Սոկետ',
          slug: 'socket',
          type: 'select',
          options: ['H1', 'H3', 'H4', 'H7', 'H8', 'H11', 'H15', 'HB3', 'HB4', 'D1S', 'D2S', 'D3S', 'D4S'],
        },
        {
          name: 'Հզորություն',
          slug: 'wattage',
          type: 'select',
          options: ['35W', '55W', '60W', '65W', '100W'],
          unit: 'W',
        },
      ],

      batteries: [
        {
          name: 'Բրենդ',
          slug: 'brand',
          type: 'multiselect',
          options: ['Varta', 'Bosch', 'Exide', 'Mutlu', 'Banner', 'Topla', 'Energizer'],
        },
        {
          name: 'Տարողունակություն',
          slug: 'capacity',
          type: 'select',
          options: [
            '35Ah',
            '40Ah',
            '45Ah',
            '50Ah',
            '55Ah',
            '60Ah',
            '65Ah',
            '70Ah',
            '74Ah',
            '80Ah',
            '90Ah',
            '100Ah',
            '110Ah',
          ],
          unit: 'Ah',
        },
        {
          name: 'Լարում',
          slug: 'voltage',
          type: 'select',
          options: ['12V', '24V'],
          unit: 'V',
        },
        {
          name: 'Մեկնարկային հոսանք',
          slug: 'startCurrent',
          type: 'select',
          options: ['300A', '360A', '420A', '480A', '540A', '600A', '680A', '720A', '800A', '900A'],
          unit: 'A',
        },
      ],

      accessories: [
        {
          name: 'Տեսակ',
          slug: 'accessoryType',
          type: 'select',
          options: [
            'Սրահի գորգեր',
            'Տեսախցիկներ',
            'Ավտոքիմիա',
            'Գործիքներ',
            'Անվտանգության համակարգ',
            'Լուսավորություն',
          ],
        },
        {
          name: 'Բրենդ',
          slug: 'brand',
          type: 'multiselect',
          options: ['3M', 'Sonax', 'Meguiars', 'Chemical Guys', 'Turtle Wax', 'Baseus', 'Xiaomi'],
        },
      ],
    }

    let count = 0
    for (const [slug, filters] of Object.entries(defs)) {
      const catId = catMap[slug]
      if (!catId) continue

      for (let i = 0; i < filters.length; i++) {
        const f = filters[i]

        await ctx.db.insert('filterDefinitions', {
          categoryId: catId,
          name: f.name,
          slug: f.slug,
          type: f.type,
          options: f.options,
          unit: f.unit,
          order: i,
        })

        count++
      }
    }

    return { seeded: count }
  },
})