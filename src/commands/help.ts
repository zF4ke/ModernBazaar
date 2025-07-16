import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from "discord.js";
import { Command } from "../types";
import { EMBED_COLORS } from "../constants";

interface HelpPage {
    title: string;
    description: string;
    commands: Array<{
        name: string;
        description: string;
        usage?: string;
    }>;
}

export const helpCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('show what this bot can do'),

    async execute(interaction: CommandInteraction) {
        if (!interaction.isRepliable()) return;

        const pages: HelpPage[] = [
            {
                title: "🤖 bazaar bot",
                description: "helps you make coins in hypixel skyblock\n\n*use the buttons below to navigate*",
                commands: [
                    {
                        name: "💰 /bazaar-price",
                        description: "check current item prices",
                        usage: "/bazaar-price item:wheat"
                    },
                    {
                        name: "📊 /market-analysis", 
                        description: "detailed market breakdown",
                        usage: "/market-analysis item:enchanted_bread"
                    },
                    {
                        name: "🔄 /flip-recommendations",
                        description: "find good items to flip",
                        usage: "/flip-recommendations budget:1000000"
                    }
                ]
            },
            {
                title: "🛠️ crafting methods",
                description: "calculate profits from crafting items",
                commands: [
                    {
                        name: "💰 /calculate-profit",
                        description: "profit for one specific recipe",
                        usage: "/calculate-profit item:enchanted_bread budget:500000"
                    },
                    {
                        name: "⚡️ /craft-flipping",
                        description: "best crafting opportunities",
                        usage: "/craft-flipping budget:5000000 count:10"
                    },
                    {
                        name: "📜 /list-recipes",
                        description: "see all available recipes",
                        usage: "/list-recipes search:diamond"
                    }
                ]
            },
            {
                title: "💰 other money making methods",
                description: "npc arbitrage with smart sorting",
                commands: [
                    {
                        name: "🏪 /npc-arbitrage",
                        description: "buy from bazaar, sell to npcs for instant profit",
                        usage: "/npc-arbitrage budget:100000 strategy:buyorder sort:balancedScore"
                    }
                ]
            },
            {
                title: "🎯 npc arbitrage sorting",
                description: "understanding the different sort options for /npc-arbitrage",
                commands: [
                    {
                        name: "⭐ Balanced Score (Default)",
                        description: "smart algorithm that balances profit, efficiency, and practicality\nfavors expensive items with high profits that don't require buying massive quantities"
                    },
                    {
                        name: "💰 Total Profit",
                        description: "highest total profit potential with your budget"
                    },
                    {
                        name: "🪙 Profit per Item",
                        description: "highest profit margin per individual item"
                    },
                    {
                        name: "⏰ Profit per Hour",
                        description: "estimated profit based on hourly instasell volume"
                    },
                    {
                        name: "⚖️ Max/Instasell Ratio",
                        description: "ratio of max affordable items to hourly instasells\nhigher ratio = less competition for sales"
                    }
                ]
            },
            {
                title: "⚙️ settings",
                description: "bot configuration",
                commands: [
                    {
                        name: "🔊 /verbose",
                        description: "toggle debug info on/off",
                        usage: "/verbose"
                    }
                ]
            }
        ];

        let currentPage = 0;

        const createEmbed = (pageIndex: number): EmbedBuilder => {
            const page = pages[pageIndex];
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle(page.title)
                .setDescription(page.description);

            if (page.commands.length > 0) {
                const commandText = page.commands
                    .map(cmd => {
                        if (cmd.usage) {
                            return `**${cmd.name}**\n${cmd.description}\n\`${cmd.usage}\``;
                        } else {
                            return `**${cmd.name}**\n${cmd.description}`;
                        }
                    })
                    .join('\n\n');
                
                embed.addFields({
                    name: ' ',
                    value: commandText,
                    inline: false
                });
            }

            embed.setFooter({ 
                text: `page ${pageIndex + 1}/${pages.length} • made because manually checking bazaar prices is boring` 
            });

            return embed;
        };

        const createButtons = (pageIndex: number): ActionRowBuilder<ButtonBuilder> => {
            return new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_prev')
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('help_next')
                        .setLabel('▶️ Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageIndex === pages.length - 1)
                );
        };

        const embed = createEmbed(currentPage);
        const buttons = createButtons(currentPage);

        const response = await interaction.reply({
            embeds: [embed],
            components: [buttons],
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({
                    content: 'only the person who used the command can navigate',
                    // ephemeral: true
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            switch (buttonInteraction.customId) {
                case 'help_prev':
                    currentPage = Math.max(0, currentPage - 1);
                    break;
                case 'help_next':
                    currentPage = Math.min(pages.length - 1, currentPage + 1);
                    break;
                case 'help_close':
                    collector.stop();
                    await buttonInteraction.update({
                        embeds: [createEmbed(currentPage)],
                        components: []
                    });
                    return;
            }

            await buttonInteraction.update({
                embeds: [createEmbed(currentPage)],
                components: [createButtons(currentPage)]
            });
        });

        collector.on('end', async () => {
            try {
                await response.edit({
                    embeds: [createEmbed(currentPage)],
                    components: []
                });
            } catch (error) {
                // Message might have been deleted, ignore
            }
        });
    }
};
