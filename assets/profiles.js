/* CoolWips SMP team: accessible six-person About Us profiles, no private data or trackers. */
(() => {
  'use strict';
  const dialog = document.getElementById('founder-profile-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const profiles = {
    coolwip: {
      name: 'CoolWip',
      role: 'SERVER OWNER',
      image: 'assets/featured/coolwip.webp',
      alt: 'Orange sports car artwork selected by CoolWip',
      bio: "The creator behind CoolWips SMP—shaping the server, building the experience, and bringing its community together.",
      story: "CoolWip is the person behind CoolWips SMP, a survival community where Java and Bedrock players make their own stories. From the server's direction to the experience players share, he's focused on making CoolWips a world worth joining, building in, and coming back to."
    },
    kaitlynn: {
      name: 'Kaitlynn',
      role: 'SPECIAL RECOGNITION',
      image: 'assets/featured/kaitlynn.webp',
      alt: 'Silhouette making a heart against the sunset',
      bio: "The woman that made all this possible. The heart behind CoolWips SMP and someone who will always have a special place in its story.",
      story: "Some people make a world meaningful without needing a title or a staff rank. For CoolWip, that's Kaitlynn. She's more than a name on the website—she's someone he wanted to recognize at the heart of everything CoolWips SMP has become. As the community grows and new stories unfold, one thing will never change: Kaitlynn is the woman that made all this possible."
    },
    orangemike: {
      name: 'Orangemike',
      role: 'ADMINISTRATOR',
      handle: '@4dbm',
      image: 'assets/staff/orangemike.webp',
      alt: "Orangemike's Discord avatar",
      bio: "Orangemike has spent countless hours moderating CoolWips SMP—supporting players, helping the community, and keeping everything organized.",
      story: "Behind the chaos of anarchy-style survival is a team that keeps the community running. Orangemike has dedicated countless hours to moderating CoolWips SMP, helping players navigate issues and giving the server a steady hand behind the scenes. As an Administrator, he's an important part of the team that makes the experience work beyond the game itself."
    },
    duck: {
      name: 'duck',
      role: 'SENIOR ADMIN',
      handle: '@buddybox_',
      image: 'assets/staff/duck.webp',
      alt: "duck's Discord avatar",
      bio: "Part of the senior administration team, duck helps keep CoolWips SMP organized and supports the players who make up its community.",
      story: "As a Senior Admin, duck is part of the team responsible for supporting CoolWips SMP and its community. From helping players find their way to backing up the rest of the staff, duck brings an important layer of support to the server."
    },
    greenreaper: {
      name: 'GreenReaperSlayer',
      role: 'JUNIOR ADMIN',
      handle: '@greenreaperslayer',
      image: 'assets/staff/greenreaper.webp',
      alt: "GreenReaperSlayer's Discord avatar",
      nickname: "Also known as Ryan, WiFi, and Right Hand.",
      bio: "GreenReaperSlayer tries to rizz up girls on Roblox with promises of farts and sweet dreams. He also can’t say “hard”—but that hasn't stopped him from trying.",
      story: "Family: His dad is a celebrity in the furry community. His mom makes a living selling doors to homeless people. His sisters earn Fortnite V-Bucks by getting homosexual content creators to craft wooden hoes."
    },
    sparky: {
      name: 'Sparky',
      role: 'MODERATOR / CONTENT CREATOR',
      handle: '@sparkyxd',
      image: 'assets/staff/sparky.webp',
      alt: "Sparky's Discord avatar",
      bio: "Known around the community as Farty or Fart nugget, Sparky is a Moderator and one of the server's standout content creators.",
      story: "Sparky helps bring new faces into CoolWips SMP through his content. With 50+ confirmed members recruited and a YouTube Short reaching 2.5 million views, he's made a noticeable mark on the community. He's also a Moderator—and, depending on who you ask, better known as Farty or Fart nugget."
    }
  };
  const sequence = ['coolwip', 'kaitlynn', 'orangemike', 'duck', 'greenreaper', 'sparky'];
  const name = document.getElementById('founder-dialog-name');
  const role = document.getElementById('founder-dialog-role');
  const handle = document.getElementById('founder-dialog-handle');
  const nicknameEl = document.getElementById('founder-dialog-nickname');
  const photo = document.getElementById('founder-dialog-photo');
  const bio = document.getElementById('founder-dialog-bio');
  const story = document.getElementById('founder-dialog-story');
  const other = document.getElementById('founder-dialog-other');
  const close = dialog.querySelector('.founder-dialog-close');
  if (![name,role,handle,nicknameEl,photo,bio,story,other,close].every(Boolean)) return;

  let lastTrigger = null;
  const show = (id, trigger) => {
    const data = profiles[id];
    if (!data) return;
    if (trigger) lastTrigger = trigger;
    name.textContent = data.name;
    role.textContent = data.role;
    handle.textContent = data.handle || '';
    handle.hidden = !data.handle;
    nicknameEl.textContent = data.nickname || '';
    nicknameEl.hidden = !data.nickname;
    photo.src = data.image;
    photo.alt = data.alt;
    bio.textContent = data.bio;
    story.textContent = data.story;
    dialog.dataset.person = id;
    const next = sequence[(sequence.indexOf(id) + 1) % sequence.length];
    other.textContent = 'Meet ' + profiles[next].name + ' →';
    other.dataset.other = next;
    other.setAttribute('aria-label', 'View ' + profiles[next].name + ' profile');
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    close.focus({preventScroll:true});
  };
  document.querySelectorAll('[data-founder]').forEach(button => {
    button.addEventListener('click', () => show(button.dataset.founder, button));
  });
  other.addEventListener('click', event => {
    event.preventDefault();
    show(other.dataset.other, null);
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right ||
                    event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus({preventScroll:true});
  });
})();