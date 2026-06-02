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
        { name: 'Բրենդ', slug: 'brand', type: 'multiselect', options: ['Michelin','Bridgestone','Continental','Pirelli','Goodyear','Hankook','Yokohama','Dunlop','Toyo','Kumho','Nokian','Cooper'] },
        { name: 'Սեզոն', slug: 'season', type: 'select', options: ['Ամառային','Ձմեռային','Ամբողջ տարվա'] },
        { name: 'Լայնություն', slug: 'width', type: 'select', options: ['155','165','175','185','195','205','215','225','235','245','255','265','275','285','295','305','315','325'] },
        { name: 'Պրոֆիլ', slug: 'profile', type: 'select', options: ['30','35','40','45','50','55','60','65','70','75','80'] },
        { name: 'Ռադիուս', slug: 'diameter', type: 'select', options: ['R13','R14','R15','R16','R17','R18','R19','R20','R21','R22'] },
        { name: 'Ինդեքս բեռնվածության', slug: 'loadIndex', type: 'select', options: ['82','86','91','94','96','98','100','102','104','106','108','110','112'] },
        { name: 'Ինդեքս արագության', slug: 'speedIndex', type: 'select', options: ['Q (160 կմ/ժ)','R (170)','S (180)','T (190)','H (210)','V (240)','W (270)','Y (300)','Z (240+)'] },
        { name: 'Run-flat', slug: 'runflat', type: 'select', options: ['Այո','Ոչ'] },
        { name: 'Տիպ', slug: 'tireType', type: 'select', options: ['Թեթև','Ամենագնաց','Բեռնատար'] },
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
        { name: 'Բրենդ', slug: 'brand', type: 'multiselect', options: ['Mobil','Castrol','Shell','Total','Liqui Moly','Motul','Valvoline','Mannol','Elf','Petronas','Kroon','Addinol'] },
        { name: 'Մածուցիկություն', slug: 'viscosity', type: 'select', options: ['0W-20','0W-30','0W-40','5W-20','5W-30','5W-40','10W-30','10W-40','15W-40','20W-50'] },
        { name: 'Տեսակ', slug: 'oilType', type: 'select', options: ['Սինթետիկ','Կիսասինթետիկ','Հանքային'] },
        { name: 'Ծավալ', slug: 'volume', type: 'select', options: ['1L','4L','5L','10L','20L','60L'], unit: 'L' },
        { name: 'API դաս', slug: 'apiClass', type: 'select', options: ['SN','SP','SM','SL','CK-4','CJ-4','CI-4','CH-4'], unit: 'API' },
        { name: 'ACEA դաս', slug: 'aceaClass', type: 'select', options: ['A3/B4','A5/B5','C2','C3','C5','E4','E6','E7','E9'] },
        { name: 'Թողարկողի թույլտվություն', slug: 'approvals', type: 'select', options: ['BMW LL-01','BMW LL-04','MB 229.31','MB 229.51','MB 229.52','VW 502.00','VW 504.00','VW 507.00','Porsche A40','Ford WSS','GM Dexos2'] },
      ],

      filters: [
        { name: 'Բրենդ', slug: 'brand', type: 'multiselect', options: ['Mann-Filter','Bosch','Mahle','Hengst','Filtron','K&N','WIX','Fram','Denso','Sakura','Goodwill','Nipparts'] },
        { name: 'Ֆիլտրի տեսակ', slug: 'filterType', type: 'select', options: ['Յուղի','Օդի','Սրահի','Վառելիքի','Այրված գազերի'] },
        { name: 'Բարձրություն', slug: 'height', type: 'select', options: ['50mm','80mm','100mm','120mm','140mm','160mm','180mm','200mm','250mm','300mm'], unit: 'mm' },
        { name: 'Արտաքին տրամագիծ', slug: 'outerDiameter', type: 'select', options: ['60mm','70mm','80mm','90mm','100mm','110mm','120mm','130mm','150mm','180mm'], unit: 'mm' },
        { name: 'Թել', slug: 'thread', type: 'select', options: ['3/4-16 UNF','M16x1.5','M18x1.5','M20x1.5','M22x1.5','M24x1.5','M27x1.5','M30x1.5'] },
      ],

      brakes: [
        { name: 'Բրենդ', slug: 'brand', type: 'multiselect', options: ['Brembo','ATE','TRW','Bosch','Ferodo','EBC','Zimmermann','Textar','Jurid','Mintal','Roadhouse'] },
        { name: 'Տեսակ', slug: 'brakeType', type: 'select', options: ['Կոճղակ','Սկավառակ','Թմբուկ','Հիդրավլիկա'] },
        { name: 'Առանցք', slug: 'axle', type: 'select', options: ['Առջևի','Հետևի','Բոլորը'] },
        { name: 'Նյութ', slug: 'material', type: 'select', options: ['Կերամիկական','Մետաղական','Օրգանական'] },
        { name: 'Հաստություն', slug: 'thickness', type: 'select', options: ['10mm','12mm','14mm','16mm','18mm','20mm','22mm','24mm','26mm','28mm','30mm','32mm'], unit: 'mm' },
      ],

      lamps: [
        { name: 'Բրենդ', slug: 'brand', type: 'multiselect', options: ['Philips','Osram','Narva','Bosch','Hella','GE','MTF','Starline'] },
        { name: 'Տեսակ', slug: 'lampType', type: 'select', options: ['LED', 'Հալոգեն', 'Քսենոն', 'HID'] },
        { name: 'Սոկետ', slug: 'socket', type: 'select', options: ['H1','H3','H4','H7','H8','H11','H15','HB3','HB4','D1S','D2S','D3S','D4S','R5W','P21W','W5W'] },
        { name: 'Գույնի ջերմաստիճան', slug: 'kelvin', type: 'select', options: ['3000K (դեղին)','4000K (չեզոք)','4300K (սպիտակ)','5000K (սառը)','5500K (օր)','6000K (կապտավուն)','8000K (կապույտ)'] },
        { name: 'Լարում', slug: 'voltage', type: 'select', options: ['12V','24V'], unit: 'V' },
        { name: 'Հզորություն', slug: 'wattage', type: 'select', options: ['5W','10W','21W','35W','55W','60W','65W','100W'], unit: 'W' },
      ],

      batteries: [
        { name: 'Բրենդ', slug: 'brand', type: 'multiselect', options: ['Varta','Bosch','Exide','Mutlu','Banner','Topla','Energizer','Delkor','Akoma','Tab','Centra'] },
        { name: 'Տարողունակություն', slug: 'capacity', type: 'select', options: ['35Ah','40Ah','45Ah','50Ah','55Ah','60Ah','65Ah','70Ah','74Ah','80Ah','90Ah','100Ah','110Ah','120Ah','140Ah','180Ah'], unit: 'Ah' },
        { name: 'Լարում', slug: 'voltage', type: 'select', options: ['12V','24V'], unit: 'V' },
        { name: 'Տեխնոլոգիա', slug: 'tech', type: 'select', options: ['Կապարաթթվային (սովորական)','AGM','EFB','Գելային'] },
        { name: 'Բևեռականություն', slug: 'polarity', type: 'select', options: ['Ուղիղ (+)','Հակառակ (-)'] },
        { name: 'Տերմինալի տիպ', slug: 'terminal', type: 'select', options: ['Եվրոպական T1','Ասիական T3','Ամերիկյան T2'] },
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