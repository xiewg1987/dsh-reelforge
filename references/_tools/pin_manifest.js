// Pinterest 采集结果（来自内置浏览器已登录会话的 DOM 槽位）
// 字段: pinId / 图片路径 / 标题 / 所属搜索词
const fs = require('fs');
const path = require('path');

const Q1 = 'storyboard app ui design';
const Q2 = 'AI video generation app interface design';
const Q3 = 'short drama storyboard app UI design';

const raw = [
  // [pinId, imgPath, title, queries]
  ['362610207467373826', 'a0/18/a0/a018a034f43ad061c3eaf6a9ca18c5e9.jpg', '', [Q1, Q3]],
  ['1018306165719959505', '90/bd/57/90bd572b4a5f1d97bd1c6efe04c23529.jpg', 'UI8 | The Ultimate Marketplace for Designers', [Q1, Q3]],
  ['649714683732933880', '1f/d1/57/1fd1572e629fa06b71e9acff02e82523.jpg', 'Behance', [Q1]],
  ['981784787520754301', '6d/c6/b3/6dc6b39014ec979561266b9469becbf5.jpg', 'Let AI Create Bedtime Magic - Try Storylix for Kids on iOS', [Q1]],
  ['752593787772455246', 'a9/9a/0d/a99a0d631d97f3ce3366780bc962846c.jpg', 'ux flow', [Q1]],
  ['1056868237566484778', 'c3/27/8c/c3278c95a3b136c05611d322367bdd19.jpg', 'Modern Storyboard & Illustration Design for Tech Recruitment', [Q1]],
  ['1120200107338578142', '50/30/4a/50304a55fe33037d74782a60920d229d.jpg', 'VideoMaker App - Fast & Reliable for Creative Edits', [Q2]],
  ['759278818473617135', 'ec/35/ee/ec35ee99dfc522eda40bd06ec76d23fa.jpg', 'AI Video & Image Generator App UI - Creative AI Mobile UX Design', [Q2]],
  ['605452743680948411', '8d/85/25/8d85257ff43e3a0ef7d6175f994e20c3.jpg', 'AI Image Generation App - UI Design - Superdribbbs Day #4', [Q2]],
  ['1108378158347542196', 'f3/8c/d8/f38cd8cdb2aecb2e76fbc1813da2d7cf.jpg', 'Text to Video AI App UI Design | AI Content Creation Experience', [Q2]],
  ['462604192996609533', '5b/22/11/5b2211a046b557bbb12d5bab5bc44641.jpg', 'AI Mobile App UX UI Design - Video Creation & Animation Dashboard for VidGen AI', [Q2]],
  ['599823244169872390', '00/a9/e7/00a9e72b937b05ec4b9af0d86637b27c.jpg', 'AI Video Generator App UI, Image to Video Creation Screen', [Q2]],
  ['683562049729055929', '9f/87/c6/9f87c66cf1f091641cb8718a41aeb9a3.jpg', 'Storyboard i did a while back', [Q3]],
  ['372321094215137815', '2e/73/36/2e7336d7c39412f45182401a0307917c.jpg', 'Kidory - kids story app, chapter player', [Q3]],
  ['642959284337380568', 'd3/52/03/d352034e737338b289f273c31e8c8404.jpg', 'Storyboard app UI kit', [Q3]],
  ['849421179742546179', '44/72/ad/4472ad4bbf70eab76d3fc9fa19751e16.jpg', 'Simple black and white vertical storyboard | Free Vector', [Q3]],
];

const items = raw.map(([id, imgPath, title, queries]) => ({
  platform: 'pinterest',
  query: queries[0],
  queries,
  id: `pin_${id}`,
  pinId: id,
  title,
  imageUrl: `https://i.pinimg.com/236x/${imgPath}`,
  page: `https://www.pinterest.com/pin/${id}/`,
  sourceHost: 'https://www.pinterest.com/',
}));

const out = path.join(process.argv[2]);
fs.writeFileSync(out, JSON.stringify({ items }, null, 2), 'utf8');
console.log(`pinterest manifest: ${items.length} items -> ${out}`);
